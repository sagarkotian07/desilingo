import { useId } from 'react'

/**
 * Mor, Desilingo's peacock. Three poses, all one SVG each: `wave` for the
 * home hero and course dashboards, `cheer` for a finished lesson, and
 * `mark`, the head alone, for the header and favicon.
 *
 * Generated from the drawings in scripts/mor by `npm run gen:mor`; edit those, not this.
 */

export type MorPose = 'wave' | 'cheer' | 'mark'

const VIEWBOX: Record<MorPose, string> = { wave: '0 0 512 512', cheer: '0 0 512 512', mark: '0 0 64 64' }

export function Mor({ pose = 'wave', className, title }: { pose?: MorPose; className?: string; title?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg
      viewBox={VIEWBOX[pose]}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {pose === 'wave' && <Wave id={id} />}
      {pose === 'cheer' && <Cheer id={id} />}
      {pose === 'mark' && <Mark />}
    </svg>
  )
}

function Wave({ id }: { id: string }) {
  return (
    <>
      <defs>
      <g id={`${id}-feather`}>
      <path d="M256 335C233 301 217 189 225 105C228 65 241 39 256 38C272 39 285 65 288 105C296 189 279 301 256 335Z" fill="#26b88d" stroke="#075c59" strokeWidth="7" strokeLinejoin="round"/>
      <path d="M256 283V139" fill="none" stroke="#087768" strokeWidth="6" strokeLinecap="round"/>
      <path d="M256 62C239 73 235 91 237 108C239 125 248 137 256 140C265 137 274 125 276 108C278 91 273 73 256 62Z" fill="#f6c554"/>
      <path d="M256 78C244 88 242 98 244 109C246 119 251 126 256 128C263 125 269 116 269 107C269 97 264 84 256 78Z" fill="#087c89"/>
      <ellipse cx="257" cy="106" rx="8" ry="12" fill="#103c53"/>
      <ellipse cx="260" cy="102" rx="3" ry="4" fill="#a1ebc2"/>
      </g>
      </defs>
      
      <g>
      <use href={`#${id}-feather`} transform="rotate(-66 256 313)"/>
      <use href={`#${id}-feather`} transform="rotate(66 256 313)"/>
      <use href={`#${id}-feather`} transform="rotate(-44 256 313)"/>
      <use href={`#${id}-feather`} transform="rotate(44 256 313)"/>
      <use href={`#${id}-feather`} transform="rotate(-22 256 313)"/>
      <use href={`#${id}-feather`} transform="rotate(22 256 313)"/>
      <use href={`#${id}-feather`}/>
      </g>
      
      <g fill="#ff962f" stroke="#123d57" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M207 397L205 428C190 429 179 438 182 446C185 454 210 452 230 446L234 403Z"/>
      <path d="M278 403L282 446C302 452 327 454 330 446C333 438 322 429 307 428L305 397Z"/>
      </g>
      <g className="mor-wing">
      <path d="M323 277C349 273 357 248 359 227L357 196C357 182 370 179 375 194L379 208L381 178C382 165 396 166 397 181L397 210L403 194C409 182 421 188 417 201L410 237C403 271 378 302 343 311Z" fill="#078aca" stroke="#123d57" strokeWidth="7" strokeLinejoin="round"/>
      <path d="M379 232Q385 241 396 237" fill="none" stroke="#006aaa" strokeWidth="6" strokeLinecap="round"/>
      </g>
      <path d="M187 266C163 268 149 288 149 310C149 328 162 338 182 333L207 299Z" fill="#078aca" stroke="#123d57" strokeWidth="7" strokeLinejoin="round"/>
      <path d="M161 309L181 313" stroke="#006aaa" strokeWidth="6" strokeLinecap="round"/>
      <path d="M201 243C175 267 167 305 179 345C195 378 314 378 334 345C349 303 336 265 312 243Z" fill="#087dc1" stroke="#123d57" strokeWidth="7"/>
      <path d="M228 270C208 287 207 317 218 339C233 351 280 354 298 338C311 317 301 286 284 273Z" fill="#29b6dd"/>
      
      <g fill="none" stroke="#123d57" strokeWidth="7" strokeLinecap="round">
      <path d="M242 154L225 119M256 148V106M271 151L288 118"/>
      </g>
      <g fill="#23b8dc" stroke="#123d57" strokeWidth="6">
      <ellipse cx="222" cy="113" rx="10" ry="13" transform="rotate(-27 222 113)"/>
      <ellipse cx="256" cy="101" rx="10" ry="14"/>
      <ellipse cx="291" cy="112" rx="10" ry="13" transform="rotate(27 291 112)"/>
      </g>
      
      <path d="M256 140C195 133 164 163 166 213C168 262 196 288 256 287C316 288 345 261 347 213C349 164 317 133 256 140Z" fill="#078aca" stroke="#123d57" strokeWidth="7"/>
      <path d="M183 208C179 178 195 157 224 155" fill="none" stroke="#32bce3" strokeWidth="9" strokeLinecap="round"/>
      <ellipse cx="218" cy="208" rx="33" ry="41" fill="#fffdf7"/>
      <ellipse cx="292" cy="206" rx="32" ry="38" fill="#fffdf7"/>
      <ellipse cx="227" cy="215" rx="16" ry="23" fill="#123149"/>
      <ellipse cx="299" cy="212" rx="16" ry="22" fill="#123149"/>
      <g fill="#fffdf7">
      <ellipse cx="231" cy="205" rx="6" ry="8"/>
      <ellipse cx="303" cy="203" rx="6" ry="8"/>
      </g>
      <g fill="#42c4df">
      <ellipse cx="192" cy="247" rx="13" ry="7" transform="rotate(16 192 247)"/>
      <ellipse cx="322" cy="244" rx="12" ry="7" transform="rotate(-16 322 244)"/>
      </g>
      <path d="M235 232Q259 219 286 229Q285 259 265 266Q244 263 235 232Z" fill="#ff962f" stroke="#123d57" strokeWidth="5" strokeLinejoin="round"/>
      <path d="M244 239Q262 246 279 236Q274 255 265 256Q252 255 244 239Z" fill="#123149"/>
      <path d="M257 252Q266 246 273 251Q266 260 257 252Z" fill="#ff8580"/>
      <path d="M232 232Q252 210 276 220L288 231Q263 242 232 232Z" fill="#ffbc44" stroke="#123d57" strokeWidth="5" strokeLinejoin="round"/>
      
      <path d="M176 332Q256 350 336 332L328 400Q256 428 184 400Z" fill="#fff5dc"/>
      <path d="M188 395Q256 421 324 395L328 400Q256 428 184 400Z" fill="#efb63f"/>
      <path d="M191 391Q256 415 321 391" fill="none" stroke="#b8452f" strokeWidth="3" strokeLinecap="round"/>
      <path d="M196 352Q222 380 238 410" fill="none" stroke="#efb63f" strokeWidth="6" strokeLinecap="round"/>
      <path d="M302 354Q318 372 322 390" fill="none" stroke="#dbc79f" strokeWidth="5" strokeLinecap="round"/>
      <path d="M176 332Q256 350 336 332L328 400Q256 428 184 400Z" fill="none" stroke="#123d57" strokeWidth="7" strokeLinejoin="round"/>
      <path d="M238 350L278 350L290 428Q258 446 226 428Z" fill="#fff5dc"/>
      <path d="M228 418Q258 434 288 418L290 428Q258 446 226 428Z" fill="#efb63f"/>
      <path d="M248 362L243 416M258 362L258 420M268 362L273 416" fill="none" stroke="#d9c398" strokeWidth="4" strokeLinecap="round"/>
      <path d="M238 350L278 350L290 428Q258 446 226 428Z" fill="none" stroke="#123d57" strokeWidth="5" strokeLinejoin="round"/>
      <path d="M178 332Q254 349 335 332L333 351Q255 366 178 351Z" fill="#fff9e9" stroke="#123d57" strokeWidth="5" strokeLinejoin="round"/>
      <path d="M182 345Q255 360 330 345" fill="none" stroke="#efb63f" strokeWidth="7"/>
      <path d="M239 349Q255 337 274 347L267 359L248 359Z" fill="#fff9e9" stroke="#123d57" strokeWidth="4" strokeLinejoin="round"/>
    </>
  )
}

function Cheer({ id }: { id: string }) {
  return (
    <>
      <defs>
      <g id={`${id}-feather`}>
      <path d="M256 335C233 301 217 189 225 105C228 65 241 39 256 38C272 39 285 65 288 105C296 189 279 301 256 335Z" fill="#26b88d" stroke="#075c59" strokeWidth="7" strokeLinejoin="round"/>
      <path d="M256 283V139" fill="none" stroke="#087768" strokeWidth="6" strokeLinecap="round"/>
      <path d="M256 62C239 73 235 91 237 108C239 125 248 137 256 140C265 137 274 125 276 108C278 91 273 73 256 62Z" fill="#f6c554"/>
      <path d="M256 78C244 88 242 98 244 109C246 119 251 126 256 128C263 125 269 116 269 107C269 97 264 84 256 78Z" fill="#087c89"/>
      <ellipse cx="257" cy="106" rx="8" ry="12" fill="#103c53"/>
      <ellipse cx="260" cy="102" rx="3" ry="4" fill="#a1ebc2"/>
      </g>
      </defs>
      <g transform="translate(0 -9)">
      
      <g>
      <use href={`#${id}-feather`} transform="rotate(-66 256 313)"/>
      <use href={`#${id}-feather`} transform="rotate(66 256 313)"/>
      <use href={`#${id}-feather`} transform="rotate(-44 256 313)"/>
      <use href={`#${id}-feather`} transform="rotate(44 256 313)"/>
      <use href={`#${id}-feather`} transform="rotate(-22 256 313)"/>
      <use href={`#${id}-feather`} transform="rotate(22 256 313)"/>
      <use href={`#${id}-feather`}/>
      </g>
      
      <g fill="#ff962f" stroke="#123d57" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M208 390L191 418C175 415 157 418 154 429C153 439 175 447 194 443L235 406Z"/>
      <path d="M278 404L316 441C336 445 358 435 356 425C353 415 336 413 320 416L304 388Z"/>
      </g>
      
      <g fill="#078aca" stroke="#123d57" strokeWidth="7" strokeLinejoin="round">
      <path d="M324 275C348 267 356 241 356 221L354 184C354 171 366 169 371 184L377 201L380 164C381 151 395 152 396 167L396 201L402 181C407 169 420 174 417 187L410 225C404 262 378 296 343 307Z"/>
      <path d="M188 275C164 267 154 244 152 223L153 192C153 178 141 177 136 190L131 203L129 173C128 159 115 161 114 175L114 205L108 186C103 173 90 179 94 192L100 231C106 267 134 297 169 308Z"/>
      </g>
      <path d="M377 223Q385 231 397 224M116 230Q128 237 137 228" fill="none" stroke="#006aaa" strokeWidth="6" strokeLinecap="round"/>
      <path d="M201 243C175 267 167 305 179 345C195 378 314 378 334 345C349 303 336 265 312 243Z" fill="#087dc1" stroke="#123d57" strokeWidth="7"/>
      <path d="M228 270C208 287 207 317 218 339C233 351 280 354 298 338C311 317 301 286 284 273Z" fill="#29b6dd"/>
      
      <g fill="none" stroke="#123d57" strokeWidth="7" strokeLinecap="round">
      <path d="M242 154L225 119M256 148V106M271 151L288 118"/>
      </g>
      <g fill="#23b8dc" stroke="#123d57" strokeWidth="6">
      <ellipse cx="222" cy="113" rx="10" ry="13" transform="rotate(-27 222 113)"/>
      <ellipse cx="256" cy="101" rx="10" ry="14"/>
      <ellipse cx="291" cy="112" rx="10" ry="13" transform="rotate(27 291 112)"/>
      </g>
      
      <path d="M256 140C195 133 164 163 166 213C168 262 196 288 256 287C316 288 345 261 347 213C349 164 317 133 256 140Z" fill="#078aca" stroke="#123d57" strokeWidth="7"/>
      <path d="M183 208C179 178 195 157 224 155" fill="none" stroke="#32bce3" strokeWidth="9" strokeLinecap="round"/>
      <ellipse cx="218" cy="208" rx="33" ry="41" fill="#fffdf7"/>
      <ellipse cx="292" cy="206" rx="32" ry="38" fill="#fffdf7"/>
      <path d="M201 216Q217 190 236 214M275 212Q291 188 308 211" fill="none" stroke="#123149" strokeWidth="10" strokeLinecap="round"/>
      <g fill="#42c4df">
      <ellipse cx="192" cy="247" rx="13" ry="7" transform="rotate(16 192 247)"/>
      <ellipse cx="322" cy="244" rx="12" ry="7" transform="rotate(-16 322 244)"/>
      </g>
      <path d="M235 232Q259 219 286 229Q290 266 265 275Q239 270 235 232Z" fill="#ff962f" stroke="#123d57" strokeWidth="5" strokeLinejoin="round"/>
      <path d="M243 237Q262 246 280 236Q280 261 265 266Q248 262 243 237Z" fill="#123149"/>
      <path d="M253 260Q267 249 276 258Q267 273 253 260Z" fill="#ff8580"/>
      <path d="M232 232Q252 210 276 220L288 231Q263 242 232 232Z" fill="#ffbc44" stroke="#123d57" strokeWidth="5" strokeLinejoin="round"/>
      
      <path d="M176 332Q256 350 336 332L328 400Q256 428 184 400Z" fill="#fff5dc"/>
      <path d="M188 395Q256 421 324 395L328 400Q256 428 184 400Z" fill="#efb63f"/>
      <path d="M191 391Q256 415 321 391" fill="none" stroke="#b8452f" strokeWidth="3" strokeLinecap="round"/>
      <path d="M196 352Q222 380 238 410" fill="none" stroke="#efb63f" strokeWidth="6" strokeLinecap="round"/>
      <path d="M302 354Q318 372 322 390" fill="none" stroke="#dbc79f" strokeWidth="5" strokeLinecap="round"/>
      <path d="M176 332Q256 350 336 332L328 400Q256 428 184 400Z" fill="none" stroke="#123d57" strokeWidth="7" strokeLinejoin="round"/>
      <path d="M238 350L278 350L290 428Q258 446 226 428Z" fill="#fff5dc"/>
      <path d="M228 418Q258 434 288 418L290 428Q258 446 226 428Z" fill="#efb63f"/>
      <path d="M248 362L243 416M258 362L258 420M268 362L273 416" fill="none" stroke="#d9c398" strokeWidth="4" strokeLinecap="round"/>
      <path d="M238 350L278 350L290 428Q258 446 226 428Z" fill="none" stroke="#123d57" strokeWidth="5" strokeLinejoin="round"/>
      <path d="M178 332Q254 349 335 332L333 351Q255 366 178 351Z" fill="#fff9e9" stroke="#123d57" strokeWidth="5" strokeLinejoin="round"/>
      <path d="M182 345Q255 360 330 345" fill="none" stroke="#efb63f" strokeWidth="7"/>
      <path d="M239 349Q255 337 274 347L267 359L248 359Z" fill="#fff9e9" stroke="#123d57" strokeWidth="4" strokeLinejoin="round"/>
      </g>
      
      <g fill="#ffbc44">
      <path d="M87 73L93 88L108 94L93 100L87 115L81 100L66 94L81 88Z"/>
      <path d="M424 67L430 81L444 87L430 93L424 107L418 93L404 87L418 81Z"/>
      <path d="M414 342L419 354L431 359L419 364L414 376L409 364L397 359L409 354Z"/>
      </g>
      <g fill="none" strokeLinecap="round" strokeWidth="8">
      <path d="M66 324L57 338M444 299L454 309" stroke="#26b88d"/>
      <path d="M180 452L167 462M329 453L342 463" stroke="#ffbc44"/>
      </g>
    </>
  )
}

function Mark() {
  return (
    <>
      <path d="M26 20L21 9M32 18V6M38 20L43 9" fill="none" stroke="#123d57" strokeWidth="3" strokeLinecap="round"/>
      <g fill="#29b6dd" stroke="#123d57" strokeWidth="2">
      <ellipse cx="20" cy="7" rx="4" ry="5" transform="rotate(-25 20 7)"/>
      <ellipse cx="32" cy="5" rx="4" ry="4"/>
      <ellipse cx="44" cy="7" rx="4" ry="5" transform="rotate(25 44 7)"/>
      </g>
      <path d="M32 17C14 14 5 23 5 37C5 53 14 61 32 61C50 61 59 53 59 37C59 23 50 14 32 17Z" fill="#078aca" stroke="#123d57" strokeWidth="2.5"/>
      <ellipse cx="21" cy="35" rx="10" ry="13" fill="#fffdf7"/>
      <ellipse cx="43" cy="34" rx="10" ry="12" fill="#fffdf7"/>
      <ellipse cx="24" cy="37" rx="5" ry="7" fill="#123149"/>
      <ellipse cx="46" cy="36" rx="5" ry="7" fill="#123149"/>
      <path d="M25 46Q32 40 42 45Q41 55 34 57Q27 55 25 46Z" fill="#ff962f"/>
      <path d="M29 48Q35 51 39 47Q37 54 34 54Q31 53 29 48Z" fill="#123149"/>
      <path d="M24 46Q32 39 42 45Q34 50 24 46Z" fill="#ffbc44"/>
    </>
  )
}
