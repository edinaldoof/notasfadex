
'use server';

import sql from 'mssql';
import type { SqlServerSettings } from '@/lib/types';

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
  };
};

export async function getProjectAccountsFromSqlServer(settings: SqlServerSettings) {
  let pool;
  try {
    const config = getDbConfig(settings);
    pool = await sql.connect(config);

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
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}
