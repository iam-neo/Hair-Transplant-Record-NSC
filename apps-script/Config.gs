var NSC_CONFIG = {
  clinicName: 'Nepalgunj Skin Center', rootFolderName: 'Nepalgunj Skin Center',
  sessionHours: 6, passwordIterations: 120000,
  sheets: {
    Users: ['UserID','FullName','Email','Username','PasswordHash','PasswordSalt','Role','Permissions','Status','CreatedAt','UpdatedAt'],
    Patients: ['PatientID','FullName','DateOfBirth','Gender','ContactNumber','Email','Address','RegistrationDate','RegisteredBy','Status','Notes','CreatedAt','UpdatedAt'],
    Consultations: ['ConsultationID','PatientID','ConsultationDate','Doctor','HairLossDuration','FamilyHistory','PreviousHairTreatment','CurrentHairTreatment','PreviousHairTransplant','MainConcern','ConsultationNotes','Recommendation','CreatedBy','CreatedAt','UpdatedBy','UpdatedAt'],
    Assessments: ['AssessmentID','PatientID','AssessmentDate','Doctor','HairLossPattern','NorwoodClassification','DonorAreaObservation','RecipientAreaObservation','HairDensityObservation','HairShaftObservation','FrontalGrafts','MidScalpGrafts','CrownGrafts','EstimatedGrafts','DoctorRecommendation','ClinicalNotes','CreatedBy','CreatedAt','UpdatedAt'],
    Procedures: ['ProcedureID','PatientID','ProcedureDate','Doctor','ProcedureType','PlannedGrafts','HarvestedGrafts','ImplantedGrafts','DonorArea','RecipientArea','StartTime','EndTime','Assistants','ProcedureStatus','ProcedureNotes','CreatedBy','CreatedAt','UpdatedAt'],
    PhotoSessions: ['PhotoSessionID','PatientID','SessionDate','SessionTime','SessionType','Reason','TakenBy','Notes','PhotoCount','DriveFolderID','CreatedAt'],
    Photos: ['PhotoID','PhotoSessionID','PatientID','Category','FileName','DriveFileID','MimeType','Size','Notes','CreatedAt'],
    FollowUps: ['FollowUpID','PatientID','FollowUpDate','FollowUpType','Status','AssignedTo','Notes','CompletedAt','CreatedBy','CreatedAt','UpdatedAt'],
    Payments: ['PaymentID','PatientID','PaymentDate','Amount','Method','Reference','Notes','CreatedBy','CreatedAt'],
    Documents: ['DocumentID','PatientID','DocumentType','FileName','DriveFileID','MimeType','Size','Notes','CreatedBy','CreatedAt'],
    Reminders: ['ReminderID','FollowUpID','Recipient','RecipientType','ScheduledAt','Status','SentAt','FailureReason','CreatedAt','UpdatedAt'],
    ActivityLogs: ['ActivityID','PatientID','UserID','Action','Entity','EntityID','Description','CreatedAt'],
    Settings: ['Key','Value','UpdatedAt']
  }
};
var ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'], ADMIN: ['patients.view','patients.create','patients.edit','patients.archive','consultations.view','consultations.create','consultations.edit','assessments.view','assessments.create','assessments.edit','procedures.view','procedures.create','procedures.edit','photos.view','photos.upload','photos.delete','followups.view','followups.create','followups.edit','followups.complete','followups.cancel','payments.view','payments.create','payments.edit','documents.view','documents.upload','documents.delete','users.view','users.create','users.edit','users.deactivate','reports.view','audit_logs.view'],
  DOCTOR: ['patients.view','patients.create','patients.edit','consultations.view','consultations.create','consultations.edit','assessments.view','assessments.create','assessments.edit','procedures.view','procedures.create','procedures.edit','photos.view','photos.upload','followups.view','followups.create','followups.edit','followups.complete','payments.view','documents.view','documents.upload'],
  ASSISTANT: ['patients.view','patients.create','photos.view','photos.upload','procedures.view','procedures.edit','followups.view','followups.create','followups.edit','documents.view','documents.upload'],
  RECEPTION: ['patients.view','patients.create','patients.edit','followups.view','payments.view','payments.create']
};
