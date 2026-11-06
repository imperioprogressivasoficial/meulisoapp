import type { Banco, Cliente } from '../types'
import { hojeISO, somarDias } from '../lib/regras'
import { substituirDiario, type Nota, type RegistroDiario } from './diario'
import { recomecar } from './cronograma'

/** Mude quando o formato ou a demonstração mudar: o aparelho recria a demo (5: app B2C de cuidados). */
export const VERSAO_BANCO = 5

/** Diário da Linda: 9 dos últimos 12 dias, com o frizz caindo e a maciez subindo. */
function diarioDemo(hoje: string): RegistroDiario[] {
  const dias: [number, Nota, Nota, Nota][] = [
    [-12, 4, 2, 2], [-11, 4, 3, 2], [-9, 4, 3, 3], [-8, 3, 3, 3], [-6, 3, 3, 3], [-5, 3, 4, 3], [-4, 2, 4, 4], [-2, 2, 4, 4], [-1, 2, 4, 4],
  ]
  return dias.map(([d, frizz, brilho, maciez]) => ({ data: somarDias(hoje, d), frizz, brilho, maciez }))
}

export function criarBancoDemo(): Banco {
  const hoje = hojeISO()

  // Cliente de demonstração
  const linda: Cliente = {
    id: 'demo',
    nome: 'Linda Souza',
    telefone: '71987654321',
    aniversario: `${String(new Date().getMonth() + 1).padStart(2, '0')}-20`,
    criadoEm: somarDias(hoje, -45),
    fotos: [],
    diagnosticos: [{
      id: 'diag-demo', data: somarDias(hoje, -44),
      respostas: { tipo: 'ondulado', espessura: 'medio', quimica: 'coloracao', sensacao: 'ressecado', objetivo: 'hidratar' },
      fio: 'Ondulado, médio', porosidade: 'Média', danos: 'Médio', foco: 'H',
      rotina: ['Hidratação toda semana', 'Nutrição a cada 10 dias', 'Finalizador leve com o cabelo úmido'],
      observacoes: ['Fio com coloração perde água mais rápido: a hidratação é a base do seu cronograma.'],
    }],
    notificacoes: [
      { id: 'n-demo', data: new Date(Date.now() - 44 * 86_400_000).toISOString(), titulo: 'Bem-vinda ao Meu Liso!', texto: 'Seu cronograma, seu diário e sua evolução ficam todos aqui.', lida: true, rota: '/cuidados', chave: 'boas-vindas' },
    ],
    consentimentoLgpdEm: new Date(Date.now() - 45 * 86_400_000).toISOString(),
    consentimentoMarketing: false,
    // respostas do primeiro acesso: ondulado com coloração, fio ressecado, frizz como incômodo principal
    onboarding: {
      objetivos: ['hidratar', 'frizz'], ultimaProgressiva: '1-3-meses', tipoCabelo: 'ondulado', apelido: 'Linda',
      comprimento: 'longo', quimicas: ['coloracao'], estado: 'ressecado', incomodos: ['frizz', 'pontas'], lavagens: 3,
      calor: 'as-vezes', lembretes: true, atualizadoEm: somarDias(hoje, -45),
    },
  }
  substituirDiario(linda.id, diarioDemo(hoje))
  recomecar(linda.id) // a demo começa sem cronograma: um toque cria a partir das respostas
  return { versao: VERSAO_BANCO, clientes: [linda], sessao: {} }
}
