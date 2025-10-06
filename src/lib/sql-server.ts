
'use server';

import sql from 'mssql';
import type { SqlServerSettings, ProjectDetails, Coordinator } from '../../../lib/types';

const getDbConfig = (settings: SqlServerSettings) => {
  if (!settings.sqlServerIp || !settings.sqlServerUser || !settings.sqlServerPassword) {
    throw new Error('Configurações de conexão com o SQL Server incompletas.');
  }

  return {
    user: settings.sqlServerUser,
    password: settings.sqlServerPassword,
    server: settings.sqlServerIp,
    database: settings.sqlServerDatabase || undefined,
    options: {
      encrypt: process.env.NODE_ENV === 'production',
      trustServerCertificate: true, 
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    connectionTimeout: 15000,
    requestTimeout: 15000,
  };
};

let pool: sql.ConnectionPool | null = null;

async function getPool(settings: SqlServerSettings) {
  if (pool && pool.connected) {
    return pool;
  }
  try {
      const config = getDbConfig(settings);
      pool = new sql.ConnectionPool(config);
      await pool.connect();
      return pool;
  } catch (err) {
      console.error("Failed to connect to SQL Server pool:", err);
      pool = null; // Reset pool on connection failure
      throw err;
  }
}

export async function getProjectAccountsFromSqlServer(settings: SqlServerSettings) {
  try {
    const pool = await getPool(settings);

    const query = `
SELECT DISTINCT
    CONCAT(cc.CC, '-', cc.DIGITO) AS contacorrente
FROM
    CONVENIO AS c
INNER JOIN situacaoProjeto AS sp ON c.CodSituacaoProjeto = sp.codigo
INNER JOIN conv_cc ON c.NUMCONV = conv_cc.NumConv
INNER JOIN CC AS cc ON conv_cc.CodCC = cc.codigo
WHERE
    c.Deletado IS NULL
    AND conv_cc.deletado IS NULL
    AND sp.descricao = 'EXECUÇÃO'
ORDER BY
    contacorrente;
`;

    const result = await pool.request().query(query);
    
    return result.recordset.map(row => {
      const formattedAccount = `${row.contacorrente}`;
      return {
        label: formattedAccount,
        value: formattedAccount,
      };
    });

  } catch (err) {
    console.error('SQL Server Query Error:', err);
    throw new Error('Falha ao consultar as contas no banco de dados externo.');
  }
}

export async function getProjectDetailsByAccount(settings: SqlServerSettings, accountNumber: string): Promise<ProjectDetails | null> {
  const accountOnly = accountNumber.split('-')[0].trim();
  
  if (!accountOnly) return null;

  try {
    const pool = await getPool(settings);
    const query = `
      SELECT DISTINCT
          c.Titulo AS Titulo_do_Projeto,
          p.DESCRICAO AS Nome_Coordenador,
          p.EMAIL AS Email_Coordenador,
          coord.ehCoordenadorGeral
      FROM CC AS cc
      INNER JOIN conv_cc AS ccc ON cc.codigo = ccc.CodCC AND (ccc.deletado IS NULL OR ccc.deletado = 0)
      INNER JOIN CONVENIO AS c ON ccc.NumConv = c.NUMCONV AND (c.Deletado IS NULL OR c.Deletado = 0)
      INNER JOIN conv_coordenador AS coord ON c.NUMCONV = coord.numConv
          AND (coord.deletado IS NULL OR coord.deletado = 0)
      INNER JOIN PESSOAS AS p ON coord.codCoordenador = p.codigo
          AND p.FISICAJURIDICA = 'f'
          AND (p.deletado IS NULL OR p.deletado = 0)
      WHERE cc.CC = @NumeroContaCorrente
        AND cc.deletado IS NULL
      ORDER BY 
          p.DESCRICAO ASC;
    `;

    const result = await pool.request()
      .input('NumeroContaCorrente', sql.VarChar, accountOnly)
      .query(query);

    if (result.recordset.length > 0) {
      const projectTitle = result.recordset[0].Titulo_do_Projeto;
      
      const uniqueCoordinators = new Map<string, Coordinator>();
      result.recordset.forEach(row => {
        const email = row.Email_Coordenador;
        if (email && !uniqueCoordinators.has(email)) {
          uniqueCoordinators.set(email, {
            name: row.Nome_Coordenador,
            email: email,
            isGeneral: row.ehCoordenadorGeral === 1 || row.ehCoordenadorGeral === true,
          });
        }
      });
      
      const coordinators = Array.from(uniqueCoordinators.values());

      return {
        projectTitle,
        coordinators,
      };
    }
    
    return null;

  } catch (err) {
    console.error(`SQL Server Project Details Query Error for account ${accountNumber}:`, err);
    return null;
  }
}
