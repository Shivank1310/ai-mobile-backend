function simpleServerVerify(analysis){
  const out = { suspicious: false, reasons: [] };
  if(!analysis){ out.reasons.push('No analysis'); return out; }
  if(analysis.cheat && analysis.cheat.suspicious){
    out.suspicious = true; out.reasons.push('Client-side flagged suspicious');
  }
  if(analysis.test === 'vertical_jump'){
    const est = parseFloat(analysis.metrics?.estimatedJumpMeters || 0);
    if(est > 3.0) { out.suspicious = true; out.reasons.push('Jump >3m'); }
  }
  if(analysis.test === 'situps'){
    const c = parseInt(analysis.metrics?.situp_count || 0);
    if(c > 200) { out.suspicious = true; out.reasons.push('Unrealistic situp count'); }
  }
  if(!out.suspicious) out.reasons.push('OK');
  return out;
}

module.exports = { simpleServerVerify };
