function permissions_(u){if(u.Permissions)return String(u.Permissions).split(',').filter(String);return ROLE_PERMISSIONS[u.Role]||[];}
function requirePermission_(u,p){var list=permissions_(u);if(list.indexOf('*')<0&&list.indexOf(p)<0)throw clientError_('You do not have permission for this action.','FORBIDDEN');}
