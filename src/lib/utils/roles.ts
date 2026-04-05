type UsuarioRol = { rol: string; es_doctor?: boolean }

/** El usuario puede atender pacientes (es doctor puro o admin con flag es_doctor) */
export function puedeAtender(u: UsuarioRol): boolean {
  return u.rol === 'doctor' || u.es_doctor === true
}

/** El usuario tiene rol dual: administra la clínica Y atiende pacientes */
export function esDualRole(u: UsuarioRol): boolean {
  return u.rol === 'admin_clinica' && u.es_doctor === true
}
