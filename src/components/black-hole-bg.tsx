import './blackhole.css';

export default function BlackHoleBg() {
  return ( 

<div className="scene" role="img" aria-label="Animated black hole pulling in email icons">
  <div className="stars"></div>
  <div className="disk"></div>
  <div className="disk inner"></div>
  <div className="photon"></div>
  <div className="horizon"></div>

  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
    <defs>
      <symbol id="env" viewBox="0 0 24 24">
        <rect x="2" y="4.5" width="20" height="15" rx="2.5"
              fill="currentColor" opacity="0.14"
              stroke="currentColor" stroke-width="1.6"/>
        <path d="M3 6.5 L12 13.5 L21 6.5"
              fill="none" stroke="currentColor"
              stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </symbol>
    </defs>
  </svg>

  <div className="angle e1"><div className="orbit"><div className="mail"><svg><use href="#env"/></svg></div></div></div>
  <div className="angle e2"><div className="orbit"><div className="mail"><svg><use href="#env"/></svg></div></div></div>
  <div className="angle e3"><div className="orbit"><div className="mail"><svg><use href="#env"/></svg></div></div></div>
  <div className="angle e4"><div className="orbit"><div className="mail"><svg><use href="#env"/></svg></div></div></div>
  <div className="angle e5"><div className="orbit"><div className="mail"><svg><use href="#env"/></svg></div></div></div>
  <div className="angle e6"><div className="orbit"><div className="mail"><svg><use href="#env"/></svg></div></div></div>
  <div className="angle e7"><div className="orbit"><div className="mail"><svg><use href="#env"/></svg></div></div></div>
  <div className="angle e8"><div className="orbit"><div className="mail"><svg><use href="#env"/></svg></div></div></div>
  <div className="angle e9"><div className="orbit"><div className="mail"><svg><use href="#env"/></svg></div></div></div>
</div>

  )
}
