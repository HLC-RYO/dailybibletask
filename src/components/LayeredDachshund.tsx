import type { CompanionMood } from "@/lib/types";

export type DachshundAction = CompanionMood | "reading" | "cheering";

type Props = {
  action: DachshundAction;
  compact?: boolean;
  label?: string;
};

export function LayeredDachshund({ action, compact = false, label = "ダックスフント" }: Props) {
  const isReading = action === "reading";
  const isSleeping = action === "sleepy";
  const isExcited = action === "excited";
  const isHappy = action === "happy" || action === "cheering";

  return (
    <div className={`layered-dachshund action-${action} ${compact ? "is-compact" : ""}`} role="img" aria-label={label}>
      <svg viewBox="0 0 520 390" className="dachshund-svg" aria-hidden="true">
        <defs>
          <linearGradient id="furMain" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#f6bd62" />
            <stop offset="0.55" stopColor="#d88a2f" />
            <stop offset="1" stopColor="#ad5e21" />
          </linearGradient>
          <linearGradient id="furLight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3cf" />
            <stop offset="1" stopColor="#e8bf82" />
          </linearGradient>
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#714219" floodOpacity="0.2" />
          </filter>
        </defs>

        <ellipse className="dog-shadow" cx="260" cy="347" rx="148" ry="24" fill="#68451e" opacity="0.14" />

        {isSleeping && (
          <g className="dog-cushion">
            <ellipse cx="260" cy="318" rx="148" ry="47" fill="#efd16e" />
            <ellipse cx="260" cy="305" rx="133" ry="35" fill="#f8df8b" />
          </g>
        )}

        <g className="dog-body-group" filter="url(#softShadow)">
          <ellipse className="dog-body" cx="274" cy="258" rx="127" ry="78" fill="url(#furMain)" />
          <ellipse className="dog-chest" cx="215" cy="266" rx="48" ry="58" fill="url(#furLight)" opacity="0.9" />

          <g className="dog-tail-group">
            <path className="dog-tail" d="M378 260 C450 236 474 270 446 300 C425 323 405 303 421 286 C432 273 413 269 385 284 Z" fill="url(#furMain)" />
          </g>

          <g className="dog-back-legs">
            <ellipse cx="337" cy="312" rx="38" ry="29" fill="#c97729" />
            <ellipse cx="194" cy="317" rx="34" ry="26" fill="#d98c35" />
          </g>

          <g className="dog-front-legs">
            <rect x="205" y="273" width="37" height="70" rx="18" fill="#df9138" />
            <rect x="286" y="273" width="37" height="70" rx="18" fill="#c97428" />
            <ellipse cx="224" cy="341" rx="29" ry="14" fill="#e6a14d" />
            <ellipse cx="304" cy="341" rx="29" ry="14" fill="#d48635" />
          </g>

          <g className="dog-head-group">
            <g className="dog-left-ear">
              <path d="M159 120 C100 128 95 218 157 244 C180 229 180 157 159 120 Z" fill="#b66525" />
              <path d="M151 134 C118 151 120 205 155 223" fill="none" stroke="#e4a15b" strokeWidth="12" strokeLinecap="round" opacity="0.55" />
            </g>
            <g className="dog-right-ear">
              <path d="M354 120 C413 128 418 218 356 244 C333 229 333 157 354 120 Z" fill="#9d4f1c" />
              <path d="M362 134 C395 151 393 205 358 223" fill="none" stroke="#d8883f" strokeWidth="12" strokeLinecap="round" opacity="0.52" />
            </g>

            <ellipse className="dog-head" cx="257" cy="162" rx="104" ry="91" fill="url(#furMain)" />
            <ellipse className="dog-muzzle" cx="257" cy="202" rx="61" ry="46" fill="url(#furLight)" />
            <ellipse cx="257" cy="186" rx="24" ry="18" fill="#3a281f" />
            <ellipse cx="250" cy="180" rx="7" ry="5" fill="#fff" opacity="0.75" />

            <g className="dog-eyes">
              <ellipse cx="216" cy="151" rx="17" ry="23" fill="#3b2518" />
              <ellipse cx="298" cy="151" rx="17" ry="23" fill="#3b2518" />
              <ellipse cx="210" cy="143" rx="6" ry="8" fill="#fff" />
              <ellipse cx="292" cy="143" rx="6" ry="8" fill="#fff" />
            </g>
            <g className="dog-eyelids">
              <path d="M198 150 Q216 137 234 150" fill="none" stroke="#7c3d1d" strokeWidth="10" strokeLinecap="round" />
              <path d="M280 150 Q298 137 316 150" fill="none" stroke="#7c3d1d" strokeWidth="10" strokeLinecap="round" />
            </g>

            <path className="dog-mouth" d="M233 215 Q257 236 281 215" fill="none" stroke="#5a2d1f" strokeWidth="7" strokeLinecap="round" />
            <path className="dog-tongue" d="M245 220 Q257 247 269 220" fill="#ef7d73" opacity={isSleeping ? 0 : 1} />
            <ellipse cx="205" cy="196" rx="17" ry="9" fill="#e98a68" opacity="0.35" />
            <ellipse cx="309" cy="196" rx="17" ry="9" fill="#e98a68" opacity="0.35" />

            <g className="dog-bandana">
              <path d="M184 222 Q257 257 330 222 L307 286 Q257 262 207 286 Z" fill="#356342" />
              <path d="M321 229 l35 20 -28 17 z" fill="#2e573a" />
            </g>
          </g>

          {isReading && (
            <g className="dog-book">
              <path d="M130 306 Q199 276 258 314 L258 361 Q196 329 130 354 Z" fill="#fff8df" stroke="#b47b3f" strokeWidth="4" />
              <path d="M258 314 Q323 276 391 306 L391 354 Q325 329 258 361 Z" fill="#fff8df" stroke="#b47b3f" strokeWidth="4" />
              <line x1="258" y1="314" x2="258" y2="361" stroke="#b47b3f" strokeWidth="3" />
              <path className="book-page" d="M266 315 Q329 285 387 309 L386 345 Q326 324 266 356 Z" fill="#fffef3" opacity="0.92" />
              {[0,1,2,3].map((i) => <line key={`l${i}`} x1="155" y1={318+i*8} x2="235" y2={329+i*7} stroke="#c6aa7b" strokeWidth="2" opacity="0.65" />)}
              {[0,1,2,3].map((i) => <line key={`r${i}`} x1="281" y1={329+i*7} x2="365" y2={318+i*8} stroke="#c6aa7b" strokeWidth="2" opacity="0.65" />)}
            </g>
          )}
        </g>

        {(isExcited || isHappy) && (
          <g className="dog-sparkles" fill="#f8ad20">
            <path d="M100 92 l7 15 15 7 -15 7 -7 15 -7-15-15-7 15-7z" />
            <path d="M414 104 l5 11 11 5 -11 5-5 11-5-11-11-5 11-5z" />
          </g>
        )}

        {isSleeping && (
          <g className="dog-zzz" fill="#6e7b69" fontFamily="sans-serif" fontWeight="800">
            <text x="372" y="115" fontSize="28">Z</text>
            <text x="402" y="87" fontSize="22">z</text>
            <text x="425" y="65" fontSize="17">z</text>
          </g>
        )}
      </svg>
    </div>
  );
}
