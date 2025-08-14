
'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import type { User, OrdemDeFornecimento } from '@prisma/client';

export interface UserWithOrderCount extends User {
    orderCount: number;
    lastOrderDate: Date | null;
}

export async function getRequestCollaborators(): Promise<UserWithOrderCount[]> {
    const session = await auth();

    if (!session?.user?.id) {
        console.error('getRequestCollaborators: Acesso não autorizado.');
        return [];
    }
    
    try {
        const usersWithOrders = await prisma.user.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: {
                        ordensDeFornecimento: true,
                    },
                },
                ordensDeFornecimento: {
                    select: { createdAt: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
        });

        return usersWithOrders.map(user => ({
            ...user,
            orderCount: user._count.ordensDeFornecimento,
            lastOrderDate: user.ordensDeFornecimento.length > 0 ? user.ordensDeFornecimento[0].createdAt : null,
        }));
    } catch (error) {
        console.error('Falha ao buscar Analistas de Solicitações:', error);
        return [];
    }
}


export async function getOrdersByUserId(userId: string): Promise<OrdemDeFornecimento[]> {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error('Acesso não autorizado. Você precisa estar logado.');
    }
    
    try {
        const orders = await prisma.ordemDeFornecimento.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
               fornecedor: true,
            }
        });
        return orders;
    } catch (error) {
        console.error(`Falha ao buscar ordens para o usuário ${userId}:`, error);
        throw new Error('Não foi possível buscar as ordens do Analista.');
    }
}
