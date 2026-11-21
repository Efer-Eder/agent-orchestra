import './octo.css';
import { OCTO_MOOD_LABEL, type OctoMood } from './mood.ts';
import { FORCE_FROM_URL } from './motion.ts';

export interface OctoMascotProps {
  /** Largura e altura em pixels. */
  size?: number;
  /** O que o Octo está fazendo. Cada humor é um loop leve, só com CSS. */
  mood?: OctoMood;
  /** Liga o movimento. Respeita "reduzir movimento" do sistema. */
  animated?: boolean;
  /**
   * `always` (padrão) anima mesmo com "reduzir movimento" ligado: decisão do
   * dono do projeto, igual ao mascote dos sites. `auto` respeita o sistema.
   */
  motion?: 'auto' | 'always';
  className?: string;
  /** Texto para leitor de tela. Use `null` quando o Octo for só decorativo. */
  label?: string | null;
}

/**
 * Octo, o mascote do Agent Orchestra: um polvo chapado na cor de destaque do
 * tema, com oito tentáculos (seis na frente e dois atrás).
 */
export function OctoMascot({
  size = 120,
  mood = 'idle',
  animated = true,
  motion = 'always',
  className = '',
  label,
}: OctoMascotProps) {
  const small = size < 40;
  const classes = [
    'octo',
    `octo--${mood}`,
    animated ? 'octo--live' : '',
    motion === 'always' || FORCE_FROM_URL ? 'octo--force' : '',
    small ? 'octo--small' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const name = label === undefined ? `Octo, ${OCTO_MOOD_LABEL[mood]}` : label;
  const a11y = name === null ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={classes} {...a11y}>
      <g className="octo-float">
        <g>
          <path className="octo-arm octo-arm--back" d="M31 48C22 50 14 46 13 39" />
          <path className="octo-arm octo-arm--back" d="M69 48C78 50 86 46 87 39" />
        </g>
        <g>
          <path className="octo-arm octo-arm--left" d="M33 54C25 62 18 64 15 57" />
          <path className="octo-arm" d="M40 58C38 70 31 77 26 74" />
          <path className="octo-arm" d="M46.5 60C46.5 72 43 81 38 82" />
          <path className="octo-arm" d="M53.5 60C53.5 72 57 81 62 82" />
          <path className="octo-arm" d="M60 58C62 70 69 77 74 74" />
          <path className="octo-arm octo-arm--right" d="M67 54C75 62 82 64 85 57" />
        </g>
        {/* Tentáculo que acena (só no humor "waving"). */}
        <path className="octo-wave" d="M66 52C76 48 81 38 79 27" />
        {/* Batuta de maestro (loading). */}
        <g className="octo-conduct">
          <path className="octo-wave" d="M66 52C76 48 81 38 79 27" />
          <path className="octo-baton" d="M79 27L91 12" />
        </g>
        {/* Lupa (reviewing). */}
        <g className="octo-magnifier">
          <path className="octo-wave" d="M67 54C72 57 76 54 77 49" />
          <path className="octo-handle" d="M77 49L80.5 43.5" />
          <circle className="octo-lens" cx="85" cy="37.5" r="7" />
        </g>
        {/* Tentáculo que aponta o problema (error). */}
        <path className="octo-wave octo-point" d="M33 52C25 53 17 57 11 63" />
        <ellipse className="octo-body" cx="50" cy="40" rx="25" ry="23" />

        {/* Olhos abertos */}
        <g className="octo-eyes">
          <g className="octo-blink">
            <ellipse className="octo-eye" cx="42" cy="40" rx="5.4" ry="6.4" />
            <ellipse className="octo-eye" cx="58" cy="40" rx="5.4" ry="6.4" />
            <g className="octo-look">
              <circle className="octo-pupil" cx="42.5" cy="41.5" r="2.9" />
              <circle className="octo-pupil" cx="58.5" cy="41.5" r="2.9" />
              {!small && (
                <>
                  <circle className="octo-eye" cx="41.4" cy="40.3" r="0.9" />
                  <circle className="octo-eye" cx="57.4" cy="40.3" r="0.9" />
                </>
              )}
            </g>
          </g>
        </g>
        {/* Olhos felizes (^ ^) e fechados (dormindo) */}
        <path
          className="octo-line octo-eyes-happy"
          d="M37.5 42Q42 35 46.5 42M53.5 42Q58 35 62.5 42"
        />
        <path
          className="octo-line octo-eyes-closed"
          d="M37.5 40Q42 44.5 46.5 40M53.5 40Q58 44.5 62.5 40"
        />
        {/* Sobrancelhas de preocupado */}
        <path className="octo-line octo-brows" d="M37 33.6L46 30.6M63 33.6L54 30.6" />

        <path className="octo-mouth octo-mouth--smile" d="M46 51Q50 54 54 51" />
        <path className="octo-mouth octo-mouth--big" d="M44.5 50Q50 57 55.5 50Z" />
        <path className="octo-mouth octo-mouth--worry" d="M46 53Q48 51 50 53Q52 55 54 53" />
      </g>

      {/* Extras de cada humor, fora do corpo para não balançar junto. */}
      {!small && (
        <>
          <g className="octo-thought">
            <circle cx="70" cy="13" r="2.2" />
            <circle cx="77.5" cy="7.5" r="2.8" />
            <circle cx="86" cy="3" r="3.4" />
          </g>
          <g className="octo-zzz">
            <path d="M72 18H77L72 23H77" />
            <path d="M80 9H86L80 15H86" />
            <path d="M89 -1H96L89 6H96" />
          </g>
          <path
            className="octo-drop"
            d="M77 24C77 24 73.5 29 73.5 31.2A3.5 3.5 0 0 0 80.5 31.2C80.5 29 77 24 77 24Z"
          />
          <g className="octo-notes">
            <path d="M14 24V14L22 12V22" />
            <circle cx="12.3" cy="24" r="2.1" />
            <circle cx="20.3" cy="22" r="2.1" />
          </g>
          <path
            className="octo-question"
            d="M19 14.5Q19 9 24.5 9Q30 9 30 14Q30 17.5 25 19.5V22.5M25 26.6V26.8"
          />
          <g className="octo-cubes">
            <rect x="78" y="74" width="7" height="7" rx="1.6" />
            <rect x="86.5" y="74" width="7" height="7" rx="1.6" />
            <rect x="82.2" y="65.5" width="7" height="7" rx="1.6" />
          </g>
          <g className="octo-spark">
            <path d="M16 20V28M12 24H20" />
            <path d="M84 16V22M81 19H87" />
            <path d="M86 40V45M83.5 42.5H88.5" />
          </g>
        </>
      )}
    </svg>
  );
}
