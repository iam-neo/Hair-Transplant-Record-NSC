// ── Run these from the editor (dropdown → ▶ Run) ──────────────────
function SETUP_ADMIN() { return setupTemporaryTestAdmin_(); }
function RESET_ADMIN_PASSWORD() {
  var s = sheet_('Users'), v = s.getDataRange().getValues(), h = v[0];
  var uCol = h.indexOf('Username'), passCol = h.indexOf('PasswordHash'), saltCol = h.indexOf('PasswordSalt');
  for (var i = 1; i < v.length; i++) {
    if (v[i][uCol] === 'nsc-admin') {
      var salt = Utilities.getUuid();
      s.getRange(i + 1, saltCol + 1).setValue(salt);
      s.getRange(i + 1, passCol + 1).setValue(hashPassword_('NSC-Test!2026-Setup', salt));
      return 'Password for nsc-admin successfully updated with the new fast hash!';
    }
  }
  return setupTemporaryTestAdmin_();
}
function INITIALIZE() { return initialize_({spreadsheetName:'NSC Hair Transplant Data'}); }

function bytesToHex_(bytes){return bytes.map(function(b){var v=(b+256)%256;return ('0'+v.toString(16)).slice(-2);}).join('');}
function hashPassword_(password,salt){var value=password+'|'+salt;for(var i=0;i<NSC_CONFIG.passwordIterations;i++)value=bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value));return value;}
function login_(p){if(!p.identity||!p.password)throw clientError_('Enter your username or email and password.');var users=rows_('Users'), identity=String(p.identity).toLowerCase(),u=users.filter(function(x){return String(x.Email).toLowerCase()===identity||String(x.Username).toLowerCase()===identity;})[0];if(!u||u.Status!=='Active'||hashPassword_(p.password,u.PasswordSalt)!==u.PasswordHash)throw clientError_('Invalid credentials.','UNAUTHORIZED');var token=Utilities.getUuid()+Utilities.getUuid(),expires=Date.now()+NSC_CONFIG.sessionHours*3600000;CacheService.getScriptCache().put('nsc_session_'+token,JSON.stringify({userId:u.UserID,expires:expires}),NSC_CONFIG.sessionHours*3600);return ok_({token:token,user:publicUser_(u)});}
function requireSession_(token){if(!token)throw clientError_('Sign in is required.','UNAUTHORIZED');var raw=CacheService.getScriptCache().get('nsc_session_'+token);if(!raw)throw clientError_('Your session has expired. Please sign in again.','SESSION_EXPIRED');var d=JSON.parse(raw),u=find_('Users','UserID',d.userId);if(!u||u.Status!=='Active')throw clientError_('This account is no longer active.','UNAUTHORIZED');return u;}
function logout_(token){if(token)CacheService.getScriptCache().remove('nsc_session_'+token);return ok_({});}
function publicUser_(u){return {id:u.UserID,name:u.FullName,email:u.Email,role:u.Role,permissions:permissions_(u)};}
// Run manually from the Apps Script editor only after initialize_(). It refuses to
// create a second bootstrap administrator and never stores the supplied password.
function setupInitialSuperAdmin_(fullName,email,username,password){if(!fullName||!email||!username||!password)throw clientError_('Name, email, username, and password are required.');if(rows_('Users').length>0)throw clientError_('A user already exists. Use the administration workflow instead.','SETUP_ALREADY_COMPLETE');var salt=Utilities.getUuid(),now=new Date();append_('Users',{UserID:nextId_('USR'),FullName:String(fullName).trim(),Email:String(email).trim().toLowerCase(),Username:String(username).trim(),PasswordHash:hashPassword_(password,salt),PasswordSalt:salt,Role:'SUPER_ADMIN',Permissions:'*',Status:'Active',CreatedAt:now,UpdatedAt:now});return 'Initial Super Admin created. Remove this setup call from your editor history and sign in through the application.';}

// TEMPORARY TEST BOOTSTRAP: run this once from the Apps Script editor only.
// Change the email before deployment, then delete this function after login works.
function setupTemporaryTestAdmin_(){return setupInitialSuperAdmin_('NSC Administrator','admin@nepalgunjskincenter.local','nsc-admin','NSC-Test!2026-Setup');}
