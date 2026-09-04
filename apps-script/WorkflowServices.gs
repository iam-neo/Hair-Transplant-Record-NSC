function followUpAction_(u,a,p){
  if(a==='followups.create'){
    requirePermission_(u,'followups.create');
    if(!p.patientId||!p.followUpDate) throw clientError_('Patient and follow-up date are required.');
    var id=nextId_('FU'),now=new Date();
    append_('FollowUps',{FollowUpID:id,PatientID:p.patientId,FollowUpDate:p.followUpDate,FollowUpType:p.followUpType||'Follow-up',Status:'Scheduled',AssignedTo:p.assignedTo||'',Notes:p.notes||'',CreatedBy:u.UserID,CreatedAt:now,UpdatedAt:now});
    (p.recipients||[]).forEach(function(recipient){
      if(recipient&&/^\S+@\S+\.\S+$/.test(recipient)) append_('Reminders',{ReminderID:nextId_('REM'),FollowUpID:id,Recipient:recipient,RecipientType:'Configured',ScheduledAt:p.reminderAt||now,Status:'Scheduled',CreatedAt:now,UpdatedAt:now});
    });
    audit_(u,p.patientId,'CREATE','FollowUp',id,'Follow-up scheduled');
    return ok_({id:id});
  }
  if(a==='followups.update'){
    requirePermission_(u,'followups.edit');
    var fid=p.followUpId||p.id;
    if(!fid) throw clientError_('FollowUp ID is required.');
    var existing=find_('FollowUps','FollowUpID',fid);
    if(!existing) throw clientError_('Follow-up not found.','NOT_FOUND');
    var updates={};
    if(p.followUpDate) updates.FollowUpDate=p.followUpDate;
    if(p.followUpType) updates.FollowUpType=p.followUpType;
    if(p.status) updates.Status=p.status;
    if(p.assignedTo!==undefined) updates.AssignedTo=p.assignedTo;
    if(p.notes!==undefined) updates.Notes=p.notes;
    updateRow_('FollowUps','FollowUpID',fid,updates);
    audit_(u,existing.PatientID||p.patientId||'','UPDATE','FollowUp',fid,'Follow-up updated');
    return ok_({id:fid});
  }
  if(a==='followups.complete'||a==='followups.cancel'){
    requirePermission_(u,a==='followups.complete'?'followups.complete':'followups.cancel');
    return updateFollowUpStatus_(u,p.followUpId||p.id,a==='followups.complete'?'Completed':'Cancelled');
  }
  if(a==='followups.delete'){
    requirePermission_(u,'followups.cancel');
    var delFid=p.followUpId||p.id;
    if(!delFid) throw clientError_('FollowUp ID is required.');
    var fRec=find_('FollowUps','FollowUpID',delFid);
    deleteRow_('FollowUps','FollowUpID',delFid);
    audit_(u,fRec?fRec.PatientID:'','DELETE','FollowUp',delFid,'Follow-up deleted');
    return ok_({id:delFid});
  }
  requirePermission_(u,'followups.view');
  return ok_({items:rows_('FollowUps').filter(function(x){return !p.patientId||x.PatientID===p.patientId;})});
}

function updateFollowUpStatus_(u,id,status){
  var s=sheet_('FollowUps'),v=s.getDataRange().getValues(),h=v[0],col=h.indexOf('FollowUpID'),row=v.findIndex(function(r,i){return i>0&&r[col]===id;});
  if(row<1) throw clientError_('Follow-up not found.','NOT_FOUND');
  var r=row+1;
  s.getRange(r,h.indexOf('Status')+1).setValue(status);
  s.getRange(r,h.indexOf('UpdatedAt')+1).setValue(new Date());
  if(status==='Completed') s.getRange(r,h.indexOf('CompletedAt')+1).setValue(new Date());
  var patientId=v[r-1][h.indexOf('PatientID')];
  audit_(u,patientId,status.toUpperCase(),'FollowUp',id,'Follow-up '+status.toLowerCase());
  return ok_({id:id,status:status});
}

function paymentAction_(u,a,p){
  if(a==='payments.create'){
    requirePermission_(u,'payments.create');
    if(!p.patientId||!p.amount) throw clientError_('Patient and amount are required.');
    var id=nextId_('PAY'),now=new Date();
    append_('Payments',{PaymentID:id,PatientID:p.patientId,PaymentDate:p.paymentDate||Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyy-MM-dd'),Amount:Number(p.amount),Method:p.method||'',Reference:p.reference||'',Notes:p.notes||'',CreatedBy:u.UserID,CreatedAt:now});
    audit_(u,p.patientId,'CREATE','Payment',id,'Payment recorded');
    return ok_({id:id});
  }
  if(a==='payments.update'){
    requirePermission_(u,'payments.edit');
    var pid=p.paymentId||p.id;
    if(!pid) throw clientError_('Payment ID is required.');
    var existing=find_('Payments','PaymentID',pid);
    if(!existing) throw clientError_('Payment not found.','NOT_FOUND');
    var updates={};
    if(p.amount) updates.Amount=Number(p.amount);
    if(p.paymentDate) updates.PaymentDate=p.paymentDate;
    if(p.method) updates.Method=p.method;
    if(p.reference!==undefined) updates.Reference=p.reference;
    if(p.notes!==undefined) updates.Notes=p.notes;
    updateRow_('Payments','PaymentID',pid,updates);
    audit_(u,existing.PatientID||p.patientId||'','UPDATE','Payment',pid,'Payment updated');
    return ok_({id:pid});
  }
  if(a==='payments.delete'){
    requirePermission_(u,'payments.edit');
    var delPid=p.paymentId||p.id;
    if(!delPid) throw clientError_('Payment ID is required.');
    var pRec=find_('Payments','PaymentID',delPid);
    deleteRow_('Payments','PaymentID',delPid);
    audit_(u,pRec?pRec.PatientID:'','DELETE','Payment',delPid,'Payment deleted');
    return ok_({id:delPid});
  }
  requirePermission_(u,'payments.view');
  return ok_({items:rows_('Payments').filter(function(x){return !p.patientId||x.PatientID===p.patientId;})});
}

function photoAction_(u,a,p){
  if(a==='photos.session.create'){
    requirePermission_(u,'photos.upload');
    if(!p.patientId) throw clientError_('Patient is required.');
    var id=nextId_('PS'),now=new Date(),folder=patientFolder_(p.patientId);
    append_('PhotoSessions',{PhotoSessionID:id,PatientID:p.patientId,SessionDate:p.sessionDate||Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyy-MM-dd'),SessionTime:p.sessionTime||Utilities.formatDate(now,Session.getScriptTimeZone(),'HH:mm'),SessionType:p.sessionType||'Other',Reason:p.reason||'',TakenBy:p.takenBy||u.FullName,Notes:p.notes||'',PhotoCount:0,DriveFolderID:folder.getId(),CreatedAt:now});
    audit_(u,p.patientId,'CREATE','PhotoSession',id,'Photo session created');
    return ok_({id:id});
  }
  if(a==='photos.upload'){
    requirePermission_(u,'photos.upload');
    if(!p.patientId||!p.base64||!p.mimeType) throw clientError_('Patient, image content, and MIME type are required.');
    if(!/^image\/(jpeg|png|webp)$/.test(p.mimeType)) throw clientError_('Only JPEG, PNG, and WebP images are allowed.');
    var id=nextId_('PHOTO'),folder=patientFolder_(p.patientId),type=p.sessionType||'Other',target=findOrCreateFolder_(folder,type),date=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd'),file=savePrivateFile_(target,p.base64,p.mimeType,p.patientId+'_'+date+'_'+sanitizeFileName_(type)+'_'+sanitizeFileName_(p.category||'Other')+'.'+(p.extension||'jpg'));
    append_('Photos',{PhotoID:id,PhotoSessionID:p.photoSessionId||'',PatientID:p.patientId,Category:p.category||'Other',FileName:file.getName(),DriveFileID:file.getId(),MimeType:p.mimeType,Size:file.getSize(),Notes:p.notes||'',CreatedAt:new Date()});
    audit_(u,p.patientId,'UPLOAD','Photo',id,'Private patient photograph uploaded');
    return ok_({id:id});
  }
  if(a==='photos.delete'){
    requirePermission_(u,'photos.delete');
    var phId=p.photoId||p.id;
    if(!phId) throw clientError_('Photo ID is required.');
    var phRec=find_('Photos','PhotoID',phId);
    if(phRec&&phRec.DriveFileID){
      try { DriveApp.getFileById(phRec.DriveFileID).setTrashed(true); } catch(e){}
    }
    deleteRow_('Photos','PhotoID',phId);
    audit_(u,phRec?phRec.PatientID:'','DELETE','Photo',phId,'Photo deleted');
    return ok_({id:phId});
  }
  requirePermission_(u,'photos.view');
  return ok_({sessions:rows_('PhotoSessions').filter(function(x){return !p.patientId||x.PatientID===p.patientId;}),items:rows_('Photos').filter(function(x){return !p.patientId||x.PatientID===p.patientId;})});
}

function documentAction_(u,a,p){
  if(a==='documents.upload'){
    requirePermission_(u,'documents.upload');
    if(!p.patientId||!p.base64||!p.mimeType) throw clientError_('Patient, file content, and MIME type are required.');
    var id=nextId_('DOC'),file=savePrivateFile_(findOrCreateFolder_(patientFolder_(p.patientId),'Documents'),p.base64,p.mimeType,p.fileName);
    append_('Documents',{DocumentID:id,PatientID:p.patientId,DocumentType:p.documentType||'Other',FileName:file.getName(),DriveFileID:file.getId(),MimeType:p.mimeType,Size:file.getSize(),Notes:p.notes||'',CreatedBy:u.UserID,CreatedAt:new Date()});
    audit_(u,p.patientId,'UPLOAD','Document',id,'Private document uploaded');
    return ok_({id:id});
  }
  if(a==='documents.delete'){
    requirePermission_(u,'documents.delete');
    var docId=p.documentId||p.id;
    if(!docId) throw clientError_('Document ID is required.');
    var docRec=find_('Documents','DocumentID',docId);
    if(docRec&&docRec.DriveFileID){
      try { DriveApp.getFileById(docRec.DriveFileID).setTrashed(true); } catch(e){}
    }
    deleteRow_('Documents','DocumentID',docId);
    audit_(u,docRec?docRec.PatientID:'','DELETE','Document',docId,'Document deleted');
    return ok_({id:docId});
  }
  requirePermission_(u,'documents.view');
  return ok_({items:rows_('Documents').filter(function(x){return !p.patientId||x.PatientID===p.patientId;})});
}

function dashboard_(u){
  requirePermission_(u,'patients.view');
  var patients=rows_('Patients').filter(function(x){return x.Status==='Active';}),
      follow=rows_('FollowUps').filter(function(x){return x.Status==='Scheduled';}),
      payments=rows_('Payments'),
      month=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM'),
      procedures=rows_('Procedures').filter(function(x){return String(x.ProcedureDate).indexOf(month)===0;});
  var totalPaid=payments.reduce(function(sum,p){ return sum+Number(p.Amount||0); },0);
  return ok_({
    patients:patients.length,
    proceduresThisMonth:procedures.length,
    upcomingFollowUps:follow.length,
    outstandingBalance:totalPaid,
    followUps:follow.slice(0,8).map(function(x){
      var p=find_('Patients','PatientID',x.PatientID);
      return {id:x.FollowUpID,patient:p?p.FullName:x.PatientID,date:x.FollowUpDate,type:x.FollowUpType,status:x.Status};
    })
  });
}
