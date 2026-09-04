function clinicalAction_(user,action,p){
  var kind=action.split('.')[0];
  var map={
    consultations:{sheet:'Consultations',prefix:'CON',permission:'consultations'},
    assessments:{sheet:'Assessments',prefix:'ASM',permission:'assessments'},
    procedures:{sheet:'Procedures',prefix:'PROC',permission:'procedures'}
  }[kind];
  if(!map) throw clientError_('Unsupported clinical entity.','NOT_FOUND');
  var primaryKey=map.sheet.slice(0,-1)+'ID';

  if(action.endsWith('.create')){
    requirePermission_(user,map.permission+'.create');
    if(!p.patientId) throw clientError_('Patient is required.');
    var id=nextId_(map.prefix),now=new Date(),r={};
    r[primaryKey]=id;
    r.PatientID=p.patientId;
    Object.keys(p).forEach(function(k){ r[k.charAt(0).toUpperCase()+k.slice(1)]=p[k]; });
    r.CreatedBy=user.UserID;
    r.CreatedAt=now;
    r.UpdatedAt=now;
    if(kind==='assessments'&&!p.estimatedGrafts) {
      r.EstimatedGrafts=Number(p.frontalGrafts||0)+Number(p.midScalpGrafts||0)+Number(p.crownGrafts||0);
    }
    append_(map.sheet,r);
    audit_(user,p.patientId,'CREATE',kind,id,kind+' record created');
    return ok_({id:id});
  }

  if(action.endsWith('.update')){
    requirePermission_(user,map.permission+'.edit');
    var recordId=p.id||p[primaryKey];
    if(!recordId) throw clientError_('Record ID is required.');
    var existing=find_(map.sheet,primaryKey,recordId);
    if(!existing) throw clientError_('Record not found.','NOT_FOUND');
    var updates={};
    Object.keys(p).forEach(function(k){
      if(k!=='id'&&k!==primaryKey) updates[k.charAt(0).toUpperCase()+k.slice(1)]=p[k];
    });
    if(kind==='assessments'&&p.estimatedGrafts===undefined&&(p.frontalGrafts||p.midScalpGrafts||p.crownGrafts)){
      updates.EstimatedGrafts=Number(p.frontalGrafts||existing.FrontalGrafts||0)+Number(p.midScalpGrafts||existing.MidScalpGrafts||0)+Number(p.crownGrafts||existing.CrownGrafts||0);
    }
    updates.UpdatedBy=user.UserID;
    updateRow_(map.sheet,primaryKey,recordId,updates);
    audit_(user,existing.PatientID||p.patientId||'','UPDATE',kind,recordId,kind+' record updated');
    return ok_({id:recordId});
  }

  if(action.endsWith('.delete')){
    requirePermission_(user,map.permission+'.edit');
    var deleteId=p.id||p[primaryKey];
    if(!deleteId) throw clientError_('Record ID is required.');
    var toDelete=find_(map.sheet,primaryKey,deleteId);
    if(!toDelete) throw clientError_('Record not found.','NOT_FOUND');
    deleteRow_(map.sheet,primaryKey,deleteId);
    audit_(user,toDelete.PatientID||'','DELETE',kind,deleteId,kind+' record deleted');
    return ok_({id:deleteId});
  }

  if(action.endsWith('.list')){
    requirePermission_(user,map.permission+'.view');
    return ok_({items:rows_(map.sheet).filter(function(x){return !p.patientId||x.PatientID===p.patientId;})});
  }

  throw clientError_('Unsupported clinical action.','NOT_FOUND');
}
