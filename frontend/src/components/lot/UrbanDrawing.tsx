// Desenho vetorial original. Serve como linguagem visual, não como cartografia do campus.
export function UrbanDrawing({ beam = false }: { beam?: boolean }) {
  return (
    <svg className="urban-drawing" viewBox="0 0 800 800" fill="none" aria-hidden="true">
      <defs>
        <pattern
          id={beam ? 'city-dots-auth' : 'city-dots-map'}
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r=".7" fill="currentColor" opacity=".16" />
        </pattern>
        <linearGradient
          id="signal-cone"
          x1="245"
          y1="55"
          x2="440"
          y2="550"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EFC54B" stopOpacity=".16" />
          <stop offset="1" stopColor="#EFC54B" stopOpacity=".015" />
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill={beam ? 'url(#city-dots-auth)' : 'url(#city-dots-map)'} />
      <g className="urban-blocks" strokeWidth="1">
        <path d="M-40 110 80 64l81 173-128 61Z M106 52 236 0l92 190-142 57Z M265 0h143l34 92-87 78Z M34 335l135-67 57 125-132 69Z M-20 495l127-51 76 174-136 62Z M127 477l111-56 77 153-113 63Z M64 718l146-59 56 142H97Z M240 650l114-54 97 204H306Z M533-20l122 68-75 137-116-71Z M682 63l155 83-97 160-138-93Z M580 240l134 65-65 121-136-69Z M682 463l158 71-73 140-141-69Z M582 635l150 72-55 123-147-70Z M434 661l63-119 107 57-66 115Z" />
        <path
          d="m54 137 34 76m36-96 38 79m-48 153 56-27m-33 58 53-26m-65 162 30 66m408-451 39 20m-67 29 40 21m66 331 45 24m-74 32 46 24"
          className="urban-roofs"
        />
      </g>
      <g className="urban-roads">
        <path d="M-40 389 362 204 837 441" />
        <path d="M334-60 465 206 301 534 454 860" />
        <path d="M-20 740 308 580 847 850" />
      </g>
      <g className="urban-road-lines" strokeDasharray="10 12">
        <path d="M-40 389 362 204 837 441" />
        <path d="M334-60 465 206 301 534 454 860" />
        <path d="M-20 740 308 580 847 850" />
      </g>
      <path d="m391 299 147 73-91 171-148-71Z" className="urban-parking-ground" />
      <g className="urban-parking-lines" transform="translate(367 337) rotate(27)">
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i} d={`M${i * 18} 0v42m0 46v42`} />
        ))}
        <path d="M0 42h108M0 88h108" />
      </g>
      <g className="urban-trees">
        {[
          [53, 325],
          [191, 264],
          [246, 604],
          [487, 535],
          [549, 391],
          [616, 441],
          [479, 641],
          [592, 229],
          [246, 742],
          [220, 340],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="10" />
            <circle cx={x} cy={y} r="4" />
          </g>
        ))}
      </g>
      <g className="urban-guides">
        <path d="M40 40h24m-24 0v24M760 40h-24m24 0v24M40 760h24m-24 0v-24M760 760h-24m24 0v-24" />
        <circle cx="414" cy="418" r="151" />
        <circle cx="414" cy="418" r="229" />
      </g>
      {beam && (
        <g>
          <path d="m244 44 318 479-237 39Z" fill="url(#signal-cone)" />
          <path d="m244 44 318 479M244 44l81 518" stroke="#EFC54B" strokeOpacity=".2" />
          <circle cx="244" cy="44" r="4" fill="#EFC54B" />
          <circle cx="244" cy="44" r="15" stroke="#EFC54B" strokeOpacity=".3" />
          <path d="M344 432h34v-36h-34Z" stroke="#EFC54B" strokeWidth="1.5" />
          <text x="354" y="421" fill="#EFC54B" fontSize="17" fontFamily="Plus Jakarta Sans">
            P
          </text>
          <path d="M384 468h34v-36h-34Z" stroke="#EFC54B" strokeOpacity=".5" />
        </g>
      )}
    </svg>
  );
}
