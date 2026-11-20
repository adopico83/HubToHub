// Configuración pública de Supabase Auth. La clave «publishable» es pública por diseño (la lleva cualquier web
// que use Supabase en el navegador); no da acceso a los datos. Puede cambiarse con variables de entorno.
export const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yougbwhvxxgmanbyykkv.supabase.co').replace(/\/+$/, '');
export const SUPABASE_CLAVE_PUBLICA = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_x7-VIY3BQ8oYtoKxk0FYCQ_OmkqqnM_';
