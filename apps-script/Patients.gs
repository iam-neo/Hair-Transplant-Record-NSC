function createPatient_(user,p){
  requirePermission_(user,'patients.create');
  if(!p.fullName||!p.contactNumber) throw clientError_('Full name and contact number are required.');
  var id=nextId_('HT'),now=new Date(),record={PatientID:id,FullName:String(p.fullName).trim(),DateOfBirth:p.dateOfBirth||'',Gender:p.gender||'',ContactNumber:String(p.contactNumber).trim(),Email:p.email||'',Address:p.address||'',RegistrationDate:Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyy-MM-dd'),RegisteredBy:user.UserID,Status:'Active',Notes:p.notes||'',CreatedAt:now,UpdatedAt:now};
  append_('Patients',record);
  createPatientFolders_(record);
  audit_(user,id,'CREATE','Patient',id,'Patient registered');
  return ok_({id:id});
}
function updatePatient_(user,p){
  requirePermission_(user,'patients.edit');
  if(!p.patientId) throw clientError_('Patient ID is required.');
  var existing=find_('Patients','PatientID',p.patientId);
  if(!existing) throw clientError_('Patient not found.','NOT_FOUND');
  var updates={};
  if(p.fullName) updates.FullName=String(p.fullName).trim();
  if(p.dateOfBirth!==undefined) updates.DateOfBirth=p.dateOfBirth;
  if(p.gender!==undefined) updates.Gender=p.gender;
  if(p.contactNumber) updates.ContactNumber=String(p.contactNumber).trim();
  if(p.email!==undefined) updates.Email=String(p.email).trim();
  if(p.address!==undefined) updates.Address=String(p.address).trim();
  if(p.notes!==undefined) updates.Notes=String(p.notes);
  if(p.status) updates.Status=p.status;
  updateRow_('Patients','PatientID',p.patientId,updates);
  audit_(user,p.patientId,'UPDATE','Patient',p.patientId,'Patient profile updated');
  return ok_({id:p.patientId});
}
function listPatients_(user,p){
  requirePermission_(user,'patients.view');
  var q=String(p.query||'').toLowerCase();
  var statusFilter=p.status;
  var items=rows_('Patients').filter(function(x){
    if(statusFilter&&statusFilter!=='All'&&x.Status!==statusFilter) return false;
    return !q||[x.PatientID,x.FullName,x.ContactNumber,x.Email].join(' ').toLowerCase().indexOf(q)>=0;
  }).map(function(x){
    return {id:x.PatientID,fullName:x.FullName,dateOfBirth:x.DateOfBirth,gender:x.Gender,contactNumber:x.ContactNumber,email:x.Email,address:x.Address,registrationDate:x.RegistrationDate,status:x.Status,lastActivity:lastActivity_(x.PatientID),notes:x.Notes};
  });
  return ok_({items:items.slice(0,Number(p.limit)||100)});
}
function duplicatePatients_(user,p){
  requirePermission_(user,'patients.create');
  var matches=rows_('Patients').filter(function(x){
    return (p.contactNumber&&String(x.ContactNumber)===String(p.contactNumber))||(p.email&&String(x.Email).toLowerCase()===String(p.email).toLowerCase())||(p.fullName&&p.dateOfBirth&&String(x.FullName).toLowerCase()===String(p.fullName).toLowerCase()&&String(x.DateOfBirth).slice(0,10)===String(p.dateOfBirth));
  });
  return ok_({possibleDuplicates:matches.map(function(x){return {id:x.PatientID,fullName:x.FullName,contactNumber:x.ContactNumber,registrationDate:x.RegistrationDate,status:x.Status};})});
}
function lastActivity_(patientId){
  var all=rows_('ActivityLogs').filter(function(a){return a.PatientID===patientId;});
  return all.length?all[all.length-1].CreatedAt:'';
}
function getPatient_(u,p){
  requirePermission_(u,'patients.view');
  var patient=find_('Patients','PatientID',p.patientId);
  if(!patient) throw clientError_('Patient not found.','NOT_FOUND');
  return ok_({patient:patient,activity:rows_('ActivityLogs').filter(function(a){return a.PatientID===p.patientId;}).reverse()});
}
function archivePatient_(u,p){
  requirePermission_(u,'patients.archive');
  var patient=find_('Patients','PatientID',p.patientId);
  if(!patient) throw clientError_('Patient not found.','NOT_FOUND');
  updateRow_('Patients','PatientID',p.patientId,{Status:'Archived'});
  audit_(u,p.patientId,'ARCHIVE','Patient',p.patientId,'Patient archived');
  return ok_({id:p.patientId});
}
function restorePatient_(u,p){
  requirePermission_(u,'patients.edit');
  var patient=find_('Patients','PatientID',p.patientId);
  if(!patient) throw clientError_('Patient not found.','NOT_FOUND');
  updateRow_('Patients','PatientID',p.patientId,{Status:'Active'});
  audit_(u,p.patientId,'RESTORE','Patient',p.patientId,'Patient restored to active status');
  return ok_({id:p.patientId});
}
function deletePatient_(u,p){
  requirePermission_(u,'patients.archive');
  var patient=find_('Patients','PatientID',p.patientId);
  if(!patient) throw clientError_('Patient not found.','NOT_FOUND');
  deleteRow_('Patients','PatientID',p.patientId);
  audit_(u,p.patientId,'DELETE','Patient',p.patientId,'Patient record permanently deleted');
  return ok_({id:p.patientId});
}
function activityList_(u,p){
  requirePermission_(u,'audit_logs.view');
  return ok_({items:rows_('ActivityLogs').filter(function(x){return !p.patientId||x.PatientID===p.patientId;}).reverse().slice(0,Number(p.limit)||100)});
}
