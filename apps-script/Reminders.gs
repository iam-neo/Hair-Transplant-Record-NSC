function formatFollowUpEmailHtml_(patient, followUp, isReminder) {
  var pName = patient ? patient.FullName : 'Valued Patient';
  var pId = patient ? patient.PatientID : (followUp.PatientID || '—');
  var fDate = followUp.FollowUpDate || 'As scheduled';
  var fTime = followUp.FollowUpTime || 'Clinic Hours (10:00 AM - 5:00 PM)';
  var fType = followUp.FollowUpType || 'Routine Follow-up';
  var currentYear = String(new Date().getFullYear());
  var logoUrl = 'https://raw.githubusercontent.com/iam-neo/Hair-Transplant-Record-NSC/main/public/Skin_logo.png';

  var notesRow = followUp.Notes ?
    '<p style="margin:12px 0 0 0; font-size:14px; line-height:1.5; color:#6b7280; border-top:1px dashed #e5e7eb; padding-top:10px;">' +
    '  <strong style="color:#374151;">Doctor\'s Note:</strong> ' + followUp.Notes +
    '</p>' : '';

  var template = '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <title>Follow-Up Reminder - Nepalgunj Skin Center</title>' +
'</head>' +
'<body style="margin:0; padding:0; background-color:#f5f7fa; font-family:Arial, Helvetica, sans-serif; color:#333333;">' +
'  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f7fa; padding:30px 15px;">' +
'    <tr>' +
'      <td align="center">' +
'        <!-- Main Container -->' +
'        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#ffffff; border-radius:10px; overflow:hidden;">' +
'          <!-- Header -->' +
'          <tr>' +
'            <td align="center" style="padding:25px 20px; border-bottom:1px solid #eeeeee;">' +
'              <img src="' + logoUrl + '" alt="Nepalgunj Skin Center" width="180" style="display:block; max-width:180px; height:auto;">' +
'            </td>' +
'          </tr>' +
'          <!-- Greeting -->' +
'          <tr>' +
'            <td style="padding:30px 35px 10px 35px;">' +
'              <h2 style="margin:0 0 15px 0; color:#1f2937; font-size:24px; line-height:1.3;">' +
'                Follow-Up Reminder' +
'              </h2>' +
'              <p style="margin:0; font-size:16px; line-height:1.7; color:#4b5563;">' +
'                Dear <strong>' + pName + '</strong>,' +
'              </p>' +
'              <p style="margin:15px 0 0 0; font-size:16px; line-height:1.7; color:#4b5563;">' +
'                This is a friendly reminder from <strong>Nepalgunj Skin Center</strong> regarding your upcoming follow-up appointment.' +
'              </p>' +
'            </td>' +
'          </tr>' +
'          <!-- Follow-Up Details -->' +
'          <tr>' +
'            <td style="padding:20px 35px;">' +
'              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border-radius:8px; border:1px solid #e5e7eb;">' +
'                <tr>' +
'                  <td style="padding:20px;">' +
'                    <p style="margin:0 0 12px 0; font-size:15px; color:#6b7280;">' +
'                      <strong style="color:#374151;">Follow-Up:</strong> ' + fType +
'                    </p>' +
'                    <p style="margin:0 0 12px 0; font-size:15px; color:#6b7280;">' +
'                      <strong style="color:#374151;">Date:</strong> ' + fDate +
'                    </p>' +
'                    <p style="margin:0 0 12px 0; font-size:15px; color:#6b7280;">' +
'                      <strong style="color:#374151;">Time:</strong> ' + fTime +
'                    </p>' +
'                    <p style="margin:0; font-size:15px; color:#6b7280;">' +
'                      <strong style="color:#374151;">Patient ID:</strong> ' + pId +
'                    </p>' +
                     notesRow +
'                  </td>' +
'                </tr>' +
'              </table>' +
'            </td>' +
'          </tr>' +
'          <!-- Information -->' +
'          <tr>' +
'            <td style="padding:5px 35px 20px 35px;">' +
'              <p style="margin:0 0 15px 0; font-size:15px; line-height:1.7; color:#4b5563;">' +
'                Regular follow-up helps our medical team monitor your progress and provide appropriate care based on your recovery.' +
'              </p>' +
'              <p style="margin:0; font-size:15px; line-height:1.7; color:#4b5563;">' +
'                If you are unable to attend at the scheduled time, please contact us in advance so we can assist you with rescheduling.' +
'              </p>' +
'            </td>' +
'          </tr>' +
'          <!-- Contact Button -->' +
'          <tr>' +
'            <td align="center" style="padding:10px 35px 30px 35px;">' +
'              <a href="tel:+9779802580007" style="display:inline-block; padding:13px 25px; background-color:#2563eb; color:#ffffff; text-decoration:none; border-radius:6px; font-size:15px; font-weight:bold;">' +
'                Contact Us' +
'              </a>' +
'            </td>' +
'          </tr>' +
'          <!-- Divider -->' +
'          <tr>' +
'            <td style="padding:0 35px;">' +
'              <div style="height:1px; background-color:#eeeeee;"></div>' +
'            </td>' +
'          </tr>' +
'          <!-- Clinic Information -->' +
'          <tr>' +
'            <td align="center" style="padding:25px 35px;">' +
'              <p style="margin:0 0 8px 0; font-size:17px; font-weight:bold; color:#1f2937;">' +
'                Nepalgunj Skin Center' +
'              </p>' +
'              <p style="margin:0 0 8px 0; font-size:13px; line-height:1.6; color:#6b7280;">' +
'                Hair Transplant &amp; Laser Clinic' +
'              </p>' +
'              <p style="margin:0 0 6px 0; font-size:13px; line-height:1.6; color:#6b7280;">' +
'                📍 Pasang Lhamu Road, Nepalgunj, Banke' +
'              </p>' +
'              <p style="margin:0 0 6px 0; font-size:13px; line-height:1.6; color:#6b7280;">' +
'                ☎ 081-534189 &nbsp; | &nbsp; 📱 9802580007' +
'              </p>' +
'            </td>' +
'          </tr>' +
'          <!-- Footer -->' +
'          <tr>' +
'            <td align="center" style="padding:15px 25px; background-color:#f8fafc;">' +
'              <p style="margin:0; font-size:12px; line-height:1.5; color:#9ca3af;">' +
'                This is an automated follow-up reminder from Nepalgunj Skin Center.' +
'              </p>' +
'              <p style="margin:8px 0 0 0; font-size:12px; color:#9ca3af;">' +
'                © ' + currentYear + ' Nepalgunj Skin Center. All rights reserved.' +
'              </p>' +
'            </td>' +
'          </tr>' +
'        </table>' +
'      </td>' +
'    </tr>' +
'  </table>' +
'</body>' +
'</html>';

  return template;
}

function sendFollowUpNotification_(recipients, patient, followUp, isReminder) {
  if (!recipients || !recipients.length) return { sent: 0 };
  var subject = 'Follow-Up Reminder - Nepalgunj Skin Center (' + (followUp.FollowUpDate || '') + ')';
  var html = formatFollowUpEmailHtml_(patient, followUp, isReminder);
  var plain = 'Follow-Up Reminder - Nepalgunj Skin Center\n\n' +
    'Dear ' + (patient ? patient.FullName : 'Patient') + ',\n\n' +
    'This is a friendly reminder from Nepalgunj Skin Center regarding your upcoming follow-up appointment.\n\n' +
    'Follow-Up: ' + (followUp.FollowUpType || '') + '\n' +
    'Date: ' + (followUp.FollowUpDate || '') + '\n' +
    'Time: ' + (followUp.FollowUpTime || 'Clinic Hours (10:00 AM - 5:00 PM)') + '\n' +
    'Patient ID: ' + (patient ? patient.PatientID : (followUp.PatientID || '')) + '\n' +
    (followUp.Notes ? 'Doctor Note: ' + followUp.Notes + '\n' : '') + '\n' +
    'Location: Pasang Lhamu Road, Nepalgunj, Banke\n' +
    'Phone: 081-534189 | Mobile: 9802580007\n';

  var sentCount = 0;
  recipients.forEach(function(email) {
    var cleanEmail = String(email).trim().toLowerCase();
    if (/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      try {
        MailApp.sendEmail({
          to: cleanEmail,
          subject: subject,
          htmlBody: html,
          body: plain,
          name: 'Nepalgunj Skin Center'
        });
        sentCount++;
      } catch (e) {
        Logger.log('Failed to send email to ' + cleanEmail + ': ' + e.message);
      }
    }
  });
  return { sent: sentCount };
}

function sendDueReminders_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var dueList = rows_('Reminders').filter(function(r) {
      return r.Status === 'Scheduled' && new Date(r.ScheduledAt) <= new Date();
    });

    dueList.forEach(function(r) {
      try {
        var followUp = find_('FollowUps', 'FollowUpID', r.FollowUpID) || { FollowUpID: r.FollowUpID, FollowUpDate: r.ScheduledAt };
        var patient = followUp.PatientID ? find_('Patients', 'PatientID', followUp.PatientID) : null;
        sendFollowUpNotification_([r.Recipient], patient, followUp, true);
        updateReminderStatus_(r.ReminderID, 'Sent', '');
      } catch (e) {
        updateReminderStatus_(r.ReminderID, 'Failed', e.message);
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function updateReminderStatus_(id, status, reason) {
  var s = sheet_('Reminders'), v = s.getDataRange().getValues(), h = v[0], idCol = h.indexOf('ReminderID') + 1;
  var row = v.findIndex(function(r, i) { return i > 0 && r[idCol - 1] === id; }) + 1;
  if (row > 1) {
    s.getRange(row, h.indexOf('Status') + 1).setValue(status);
    s.getRange(row, h.indexOf('SentAt') + 1).setValue(status === 'Sent' ? new Date() : '');
    s.getRange(row, h.indexOf('FailureReason') + 1).setValue(reason);
    s.getRange(row, h.indexOf('UpdatedAt') + 1).setValue(new Date());
  }
}
