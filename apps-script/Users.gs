function userAction_(u,a,p){
  requirePermission_(u,'users.view');
  if(a==='users.list') return ok_({items:rows_('Users').map(function(x){
    var pub=publicUser_(x);
    return {id:pub.id,name:pub.name,email:pub.email,role:pub.role,permissions:pub.permissions,status:x.Status||'Active'};
  })});
  if(a==='users.create'){
    requirePermission_(u,'users.create');
    if(!p.fullName||!p.email||!p.username||!p.password||!p.role) throw clientError_('Name, email, username, temporary password, and role are required.');
    if(find_('Users','Email',p.email)||find_('Users','Username',p.username)) throw clientError_('An account with that email or username already exists.');
    var salt=Utilities.getUuid(),id=nextId_('USR'),now=new Date();
    append_('Users',{UserID:id,FullName:p.fullName,Email:p.email,Username:p.username,PasswordHash:hashPassword_(p.password,salt),PasswordSalt:salt,Role:p.role,Permissions:(p.permissions||[]).join(','),Status:'Active',CreatedAt:now,UpdatedAt:now});
    audit_(u,'','CREATE','User',id,'User account created');
    return ok_({id:id});
  }
  if(a==='users.update'){
    requirePermission_(u,'users.edit');
    if(!p.userId) throw clientError_('User ID is required.');
    var existing=find_('Users','UserID',p.userId);
    if(!existing) throw clientError_('User not found.','NOT_FOUND');
    var updates={};
    if(p.fullName) updates.FullName=String(p.fullName).trim();
    if(p.email) updates.Email=String(p.email).trim().toLowerCase();
    if(p.username){
      var cleanU=String(p.username).trim();
      var taken=find_('Users','Username',cleanU);
      if(taken&&taken.UserID!==p.userId) throw clientError_('Username is already taken.');
      updates.Username=cleanU;
    }
    if(p.role) updates.Role=p.role;
    if(p.permissions!==undefined) updates.Permissions=(p.permissions||[]).join(',');
    updateRow_('Users','UserID',p.userId,updates);
    audit_(u,'','UPDATE','User',p.userId,'User details updated by administrator');
    return ok_({id:p.userId});
  }
  if(a==='users.resetPassword'){
    requirePermission_(u,'users.edit');
    if(!p.userId||!p.password) throw clientError_('User ID and new password are required.');
    if(p.password.length<8) throw clientError_('Password must be at least 8 characters.');
    var salt=Utilities.getUuid();
    updateRow_('Users','UserID',p.userId,{PasswordHash:hashPassword_(p.password,salt),PasswordSalt:salt});
    audit_(u,'','UPDATE','User',p.userId,'User password reset by administrator');
    return ok_({id:p.userId,message:'Password reset successfully.'});
  }
  if(a==='users.activate'){
    requirePermission_(u,'users.edit');
    if(!p.userId) throw clientError_('User ID is required.');
    updateRow_('Users','UserID',p.userId,{Status:'Active'});
    audit_(u,'','ACTIVATE','User',p.userId,'User account re-activated');
    return ok_({id:p.userId});
  }
  if(a==='users.deactivate'){
    requirePermission_(u,'users.deactivate');
    if(p.userId===u.UserID) throw clientError_('You cannot deactivate your own account.');
    updateRow_('Users','UserID',p.userId,{Status:'Disabled'});
    audit_(u,'','DEACTIVATE','User',p.userId,'User account disabled');
    return ok_({id:p.userId});
  }
  throw clientError_('Unsupported user action.','NOT_FOUND');
}
