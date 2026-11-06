/**
 * Evolução (/evolucao): fotos do cabelo ao longo do tempo. Com duas ou mais,
 * compara a primeira com a mais recente.
 */
import { useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { Cliente } from '../../types'
import { Cabecalho, Cartao, TituloSecao } from '../../ds/componentes'
import { EntradaFoto, FotoSalva, Vazio, toast } from '../../ds/extras'
import { adicionarFoto, removerFotoCliente } from '../../data/acoes'
import { modoNuvem } from '../../data/nuvem'
import { apagarImagem } from '../../lib/imagem'
import { formatarData, hojeISO } from '../../lib/regras'
import { Sino } from './Inicio'

export function Evolucao({ cliente }: { cliente: Cliente }) {
  const [comparar, setComparar] = useState(50)
  // da mais recente para a mais antiga
  const fotos = cliente.fotos.filter((f) => f.tipo === 'evolucao').sort((a, b) => b.data.localeCompare(a.data))
  const recente = fotos[0]
  const primeira = fotos[fotos.length - 1]
  const data = (d: string) => formatarData(d, { day: '2-digit', month: 'short' })

  return (
    <>
      <Cabecalho titulo="Evolução" direita={<Sino cliente={cliente} />} />
      <div className="tela">
        {fotos.length >= 2 && (
          <Cartao>
            <TituloSecao>Sua evolução</TituloSecao>
            <div className="comparador">
              <FotoSalva id={recente.id} alt={`Foto de ${data(recente.data)}`} />
              <div style={{ clipPath: `inset(0 ${100 - comparar}% 0 0)` }}><FotoSalva id={primeira.id} alt={`Foto de ${data(primeira.data)}`} /></div>
              <span className="comparador__linha" style={{ left: `${comparar}%` }} />
              <span className="comparador__rot esq">{data(primeira.data)}</span>
              <span className="comparador__rot dir">{recente.data === hojeISO() ? 'Hoje' : data(recente.data)}</span>
            </div>
            <input type="range" min={0} max={100} value={comparar} onChange={(e) => setComparar(Number(e.target.value))} className="regua" aria-label="Comparar a primeira foto com a mais recente" />
          </Cartao>
        )}

        <Cartao>
          <TituloSecao>Adicionar foto</TituloSecao>
          <EntradaFoto camera={false} rotulo="Escolher foto de hoje" onFoto={(id) => { adicionarFoto(cliente.id, { id, data: hojeISO(), tipo: 'evolucao' }); toast('Foto salva na sua evolução!') }} />
          <p className="fraco">Dica: tire a foto sempre no mesmo lugar, com a mesma luz e o cabelo do mesmo jeito (solto, seco). {modoNuvem() ? 'As fotos ficam numa pasta privada da sua conta.' : 'As fotos ficam guardadas só neste aparelho.'}</p>
        </Cartao>

        {fotos.length === 0 ? (
          <Vazio icone={ImagePlus} titulo="Sua evolução começa hoje" texto="Guarde uma foto agora e outra daqui a algumas semanas para ver a diferença." />
        ) : (
          <>
            <TituloSecao>{fotos.length === 1 ? '1 foto' : `${fotos.length} fotos`}</TituloSecao>
            <div className="grade-3">
              {fotos.map((f) => (
                <div key={f.id} className="galeria-item">
                  <FotoSalva id={f.id} alt={`Foto de ${data(f.data)}`} />
                  <span>{data(f.data)}</span>
                  <button aria-label="Apagar foto" onClick={() => { removerFotoCliente(cliente.id, f.id); apagarImagem(f.id) }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
