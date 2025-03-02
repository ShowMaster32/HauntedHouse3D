// Verifica se m4 è già definito
if (typeof m4 !== 'undefined') {
  // Crea un alias per m4.orthographic come m4.ortho
  if (typeof m4.orthographic === 'function' && typeof m4.ortho !== 'function') {
      m4.ortho = m4.orthographic;
      console.log('Successfully created alias m4.ortho for m4.orthographic');
  }
  
}