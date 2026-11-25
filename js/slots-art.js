/* Original vector artwork. Each symbol shares a consistent light direction. */
const SlotsArt = (() => {
  const gold = 'url(#gold)', aqua = 'url(#aqua)';
  const defs = '<defs><linearGradient id="gold" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#fff2b3"/><stop offset=".3" stop-color="#e7bd61"/><stop offset=".55" stop-color="#a66b24"/><stop offset=".75" stop-color="#f8dc8b"/><stop offset="1" stop-color="#80511f"/></linearGradient><linearGradient id="aqua" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b5fff1"/><stop offset=".4" stop-color="#26bea9"/><stop offset="1" stop-color="#075258"/></linearGradient><radialGradient id="pearl" cx=".33" cy=".25"><stop stop-color="#fff"/><stop offset=".35" stop-color="#fff4e4"/><stop offset=".7" stop-color="#b1ced5"/><stop offset=".9" stop-color="#758baf"/><stop offset="1" stop-color="#e5dfed"/></radialGradient><linearGradient id="red" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#ffb1a0"/><stop offset=".45" stop-color="#e0574c"/><stop offset="1" stop-color="#8f2027"/></linearGradient><linearGradient id="ivory" x1=".15" y1="0" x2=".75" y2="1"><stop stop-color="#fffdf5"/><stop offset=".55" stop-color="#f3ead4"/><stop offset="1" stop-color="#d9c9a5"/></linearGradient><linearGradient id="silver" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#ffffff"/><stop offset=".3" stop-color="#d3dbe3"/><stop offset=".55" stop-color="#7f8c99"/><stop offset=".75" stop-color="#e8eef3"/><stop offset="1" stop-color="#55606c"/></linearGradient><filter id="shadow" x="-.3" y="-.3" width="1.6" height="1.6"><feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#000" flood-opacity=".5"/></filter></defs>';
  // Roulette wheel: pockets, spokes and ball are computed around its centre (80,64).
  const at = (r, a) => (80 + r * Math.cos(a)).toFixed(1) + ' ' + (64 + r * Math.sin(a)).toFixed(1);
  const pockets = Array.from({ length: 16 }, (_, i) => {
    const a0 = i * Math.PI / 8 - Math.PI / 2, a1 = a0 + Math.PI / 8;
    return '<path d="M' + at(30, a0) + 'L' + at(48, a0) + 'A48 48 0 0 1 ' + at(48, a1) +
      'L' + at(30, a1) + 'A30 30 0 0 0 ' + at(30, a0) + 'Z" fill="' + (i % 2 ? '#131b21' : '#c23b34') +
      '" stroke="#e7bd61" stroke-width="1"/>';
  }).join('');
  const spokes = Array.from({ length: 4 }, (_, i) => '<path d="M' + at(11, i * Math.PI / 2 + Math.PI / 4) + 'L' + at(27, i * Math.PI / 2 + Math.PI / 4) + '"/>').join('');
  const ballX = (80 + 50 * Math.cos(-2.45)).toFixed(1), ballY = (64 + 50 * Math.sin(-2.45)).toFixed(1);
  const shapes = {
    chip: '<circle cx="80" cy="80" r="58" fill="url(#red)" stroke="#6f1a1f" stroke-width="3"/>' +
      Array.from({ length: 6 }, (_, i) => '<rect x="74" y="25" width="12" height="17" rx="3" fill="#f7f1e3" transform="rotate(' + (i * 60) + ' 80 80)"/>').join('') +
      '<circle cx="80" cy="80" r="36" fill="#f7f1e3" stroke="url(#gold)" stroke-width="4"/>' +
      '<circle cx="80" cy="80" r="28" fill="none" stroke="#c9b073" stroke-width="2"/>' +
      '<path d="M80 65L83.8 74.7L94.3 75.4L86.2 82L88.8 92.1L80 86.5L71.2 92.1L73.8 82L65.7 75.4L76.2 74.7Z" fill="url(#gold)" stroke="#795322" stroke-width="1.5"/>',
    die: '<g transform="rotate(-12 80 80)"><rect x="30" y="30" width="100" height="100" rx="18" fill="url(#ivory)" stroke="url(#gold)" stroke-width="5"/><rect x="38" y="38" width="84" height="84" rx="12" fill="none" stroke="#d8caa6" stroke-width="2"/>' +
      [[54, 54], [106, 54], [80, 80], [54, 106], [106, 106]].map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="10.5" fill="#12313a"/>').join('') +
      '<path d="M46 54Q48 44 58 41" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".7"/></g>',
    bell: '<circle cx="80" cy="24" r="9" fill="url(#silver)" stroke="#3a4450" stroke-width="2"/>' +
      '<path d="M80 32c-20 0-33 15-35 36-2 15-7 25-14 33h98c-7-8-12-18-14-33-2-21-15-36-35-36z" fill="url(#silver)" stroke="#3a4450" stroke-width="3"/>' +
      '<rect x="26" y="99" width="108" height="16" rx="7" fill="url(#silver)" stroke="#3a4450" stroke-width="3"/>' +
      '<path d="M80 115v6" stroke="#3a4450" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="80" cy="130" r="11" fill="url(#red)" stroke="#6f1a1f" stroke-width="3"/>' +
      '<path d="M58 48c-6 8-9 18-10 27" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".7"/>',
    diamond: '<path d="M49 27H111L139 64L80 139L21 64Z" fill="' + aqua + '" stroke="#a0f5d4" stroke-width="3"/><path d="M49 27L59 64L80 139L100 64L111 27M21 64H139M49 27L80 64L111 27" fill="none" stroke="#c8ffea" stroke-width="2"/><path d="M49 27L21 64H59Z" fill="#edfff4" opacity=".6"/><path d="M100 64H139L80 139Z" fill="#095457" opacity=".65"/><path d="M80 31L83 42L94 45L83 48L80 59L77 48L66 45L77 42Z" fill="white"/>',
    vault: '<rect x="20" y="32" width="120" height="106" rx="14" fill="#14343c" stroke="url(#gold)" stroke-width="5"/>' +
      '<rect x="33" y="45" width="94" height="80" rx="9" fill="#1e4a54" stroke="#c2a366" stroke-width="3"/>' +
      '<rect x="14" y="54" width="16" height="14" rx="4" fill="url(#gold)" stroke="#674927" stroke-width="2"/>' +
      '<rect x="14" y="96" width="16" height="14" rx="4" fill="url(#gold)" stroke="#674927" stroke-width="2"/>' +
      '<circle cx="70" cy="85" r="25" fill="url(#gold)" stroke="#674927" stroke-width="3"/>' +
      '<g stroke="#8a5a20" stroke-width="5" stroke-linecap="round"><path d="M70 72V60M70 98v12M57 85H45M83 85h12"/></g>' +
      '<circle cx="70" cy="85" r="13" fill="#14343c" stroke="#795322" stroke-width="2"/>' +
      '<rect x="104" y="70" width="10" height="30" rx="5" fill="url(#gold)" stroke="#674927" stroke-width="2"/>' +
      '<path d="M34 138h16v8H34zM110 138h16v8h-16z" fill="#0f2c33" stroke="#674927" stroke-width="2"/>',
    crown: '<path d="M31 111L18 46L52 68L80 24L109 68L143 46L129 111Z" fill="' + gold + '" stroke="#fff0b0" stroke-width="2"/><path d="M34 111Q80 95 126 111V129Q80 143 34 129Z" fill="' + gold + '" stroke="#795322" stroke-width="2"/><path d="M80 66L91 84L80 103L69 84Z" fill="' + aqua + '" stroke="#fff0be" stroke-width="3"/><circle cx="18" cy="43" r="7" fill="url(#pearl)"/><circle cx="80" cy="22" r="7" fill="url(#pearl)"/><circle cx="143" cy="43" r="7" fill="url(#pearl)"/><path d="M44 121Q80 113 117 121" fill="none" stroke="#fff1b2" stroke-width="3"/>',
    wild: '<circle cx="80" cy="77" r="61" fill="#123e48" stroke="' + gold + '" stroke-width="5"/><circle cx="80" cy="77" r="53" fill="none" stroke="#c2a366"/>' +
      '<g transform="rotate(-15 78 68)"><rect x="44" y="34" width="48" height="66" rx="7" fill="#0e3b45" stroke="' + gold + '" stroke-width="4"/><path d="M54 48h28M54 60h28M54 72h28M54 84h28" stroke="#c2a366" stroke-width="3" stroke-linecap="round" opacity=".75"/></g>' +
      '<g transform="rotate(11 86 70)"><rect x="66" y="32" width="48" height="68" rx="7" fill="#f7efdb" stroke="' + gold + '" stroke-width="4"/><path d="M90 50L93.9 60.7L105.2 61.1L96.3 68L99.4 78.9L90 72.6L80.6 78.9L83.7 68L74.8 61.1L86.1 60.7Z" fill="' + gold + '" stroke="#795322" stroke-width="2"/><circle cx="75" cy="41" r="3.2" fill="#c23b34"/><circle cx="105" cy="91" r="3.2" fill="#c23b34"/></g>' +
      '<path d="M47 117H113L121 140H39Z" fill="#1a5a50" stroke="#dfc181"/><text x="80" y="135" text-anchor="middle" fill="#fff0c5" font-family="Georgia" font-weight="bold" font-size="20" letter-spacing="2">WILD</text>',
    scatter: '<circle cx="80" cy="64" r="53" fill="#0e2f38" stroke="' + gold + '" stroke-width="6"/>' + pockets +
      '<circle cx="80" cy="64" r="29" fill="#16414c" stroke="#e7bd61" stroke-width="2"/>' +
      '<g fill="none" stroke="#e7bd61" stroke-width="3" stroke-linecap="round">' + spokes + '</g>' +
      '<circle cx="80" cy="64" r="11" fill="' + gold + '" stroke="#674927" stroke-width="2"/><circle cx="80" cy="64" r="4" fill="#674927"/>' +
      '<circle cx="' + ballX + '" cy="' + ballY + '" r="6" fill="#fff7e0" stroke="#c9b073" stroke-width="2"/>' +
      '<path d="M37 122H123L130 146H30Z" fill="#234d68" stroke="#e4c997"/><text x="80" y="139" text-anchor="middle" fill="#fff0d2" font-family="Georgia" font-weight="bold" font-size="14" letter-spacing="1">SCATTER</text>'
  };
  function svg(id) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">' + defs + '<g filter="url(#shadow)">' + shapes[id] + '</g></svg>'; }
  const urls = Object.fromEntries(Object.keys(shapes).map(id => [id, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(id))]));
  return { svg, urls };
})();
