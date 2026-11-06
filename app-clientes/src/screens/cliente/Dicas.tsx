import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import type { Cliente } from '../../types'
import { Botao, Cabecalho, Cartao, Etiqueta, Folha, TituloDestaque } from '../../ds/componentes'
import { Foto } from '../../ds/extras'
import { AUTORA_DICAS, DICAS } from '../../data/dicas'
import { voltar } from '../../lib/rotas'

/** Dicas de cuidado (/dicas): as do seu tipo de cabelo aparecem primeiro. */
export function Dicas({ cliente }: { cliente: Cliente }) {
  const [aberta, setAberta] = useState<string>()
  const tipo = cliente.onboarding?.tipoCabelo
  const ordenadas = [...DICAS].sort((a, b) => Number(!!tipo && b.para.includes(tipo)) - Number(!!tipo && a.para.includes(tipo)))
  const dica = DICAS.find((d) => d.id === aberta)

  return (
    <>
      <Cabecalho titulo="Dicas de cuidado" onVoltar={() => voltar()} />
      <section className="cuid-topo">
        <TituloDestaque linha="Dicas para o" destaque="seu cabelo" tom="areia" />
        <p className="suave centro">Leituras curtas para o dia a dia. Curadoria de {AUTORA_DICAS}.</p>
      </section>
      <div className="tela">
        <div className="grade-2">
          {ordenadas.map((d) => (
            <Cartao key={d.id} className="conteudo" onClick={() => setAberta(d.id)}>
              <div className="conteudo__capa">
                <Foto chave={d.foto} />
                <span><BookOpen size={20} /></span>
              </div>
              <strong>{d.titulo}</strong>
              <small className="suave">Leitura · {d.duracao}</small>
              {!!tipo && d.para.includes(tipo) && <Etiqueta tom="ouro">Para você</Etiqueta>}
            </Cartao>
          ))}
        </div>
      </div>
      <Folha aberta={!!dica} onFechar={() => setAberta(undefined)}>
        {dica && (
          <>
            <h2>{dica.titulo}</h2>
            <ul className="lista-artigo">{dica.texto.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="fraco">Por {AUTORA_DICAS}</p>
            <Botao onClick={() => setAberta(undefined)}>Fechar</Botao>
          </>
        )}
      </Folha>
    </>
  )
}
