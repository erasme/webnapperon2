
(function() {
var appBase = Core.Util.baseDirectory('wn-debug.js');

// include RFID support
Core.Util.include(appBase+'wn/rfidreader.js');
Core.Util.include(appBase+'wn/rfid.js');

// include shared applications resources
Core.Util.include(appBase+'wn/ratioimage.js');
Core.Util.include(appBase+'wn/selectionbutton.js');
Core.Util.include(appBase+'wn/filepostuploader.js');
Core.Util.include(appBase+'wn/ratiobox.js');
Core.Util.include(appBase+'wn/field.js');
Core.Util.include(appBase+'wn/groupfield.js');
Core.Util.include(appBase+'wn/textfield.js');
Core.Util.include(appBase+'wn/textareafield.js');
Core.Util.include(appBase+'wn/sliderfield.js');
Core.Util.include(appBase+'wn/checkfield.js');
Core.Util.include(appBase+'wn/datefield.js');
Core.Util.include(appBase+'wn/menutoolbar.js');
Core.Util.include(appBase+'wn/newribbon.js');
Core.Util.include(appBase+'wn/optionsection.js');
Core.Util.include(appBase+'wn/contentbggraphic.js');
Core.Util.include(appBase+'wn/listaddbutton.js');
Core.Util.include(appBase+'wn/improvedtext.js');
Core.Util.include(appBase+'wn/flowdropbox.js');
Core.Util.include(appBase+'wn/sflowdropbox.js');
Core.Util.include(appBase+'wn/vdropbox.js');
Core.Util.include(appBase+'wn/hdropbox.js');
Core.Util.include(appBase+'wn/groupiconview.js');
Core.Util.include(appBase+'wn/resource.js');
Core.Util.include(appBase+'wn/userface.js');
Core.Util.include(appBase+'wn/resourceviewgraphic.js');
Core.Util.include(appBase+'wn/resourceview.js');
Core.Util.include(appBase+'wn/contact.js');
Core.Util.include(appBase+'wn/videoconfview.js');
Core.Util.include(appBase+'wn/contactmessagesdialog.js');
Core.Util.include(appBase+'wn/historymessagesdialog.js');
Core.Util.include(appBase+'wn/userstatsdialog.js');
Core.Util.include(appBase+'wn/contactview.js');
Core.Util.include(appBase+'wn/user.js');
Core.Util.include(appBase+'wn/queue.js');
Core.Util.include(appBase+'wn/webaccountsection.js');
Core.Util.include(appBase+'wn/stylesection.js');
Core.Util.include(appBase+'wn/readersection.js');
Core.Util.include(appBase+'wn/devicesection.js');
Core.Util.include(appBase+'wn/rfidsection.js');
Core.Util.include(appBase+'wn/userprofil.js');
Core.Util.include(appBase+'wn/userview.js');
Core.Util.include(appBase+'wn/message.js');
Core.Util.include(appBase+'wn/messageview.js');
Core.Util.include(appBase+'wn/preview.js');
Core.Util.include(appBase+'wn/viewer.js');
Core.Util.include(appBase+'wn/resourcepropertiesdialog.js');
Core.Util.include(appBase+'wn/resourcesharessection.js');
Core.Util.include(appBase+'wn/resourceviewer.js');
Core.Util.include(appBase+'wn/menuswitch.js');
Core.Util.include(appBase+'wn/croppedimage.js');
Core.Util.include(appBase+'wn/scaledimage.js');
Core.Util.include(appBase+'wn/scaledimage2.js');
Core.Util.include(appBase+'wn/resourcenew.js');
Core.Util.include(appBase+'wn/resourcecreator.js');
Core.Util.include(appBase+'wn/wizarditem.js');
Core.Util.include(appBase+'wn/resourcewizard.js');
Core.Util.include(appBase+'wn/logincreator.js');
Core.Util.include(appBase+'wn/loginwizard.js');
Core.Util.include(appBase+'wn/addcontacticon.js');
Core.Util.include(appBase+'wn/addworldicon.js');
Core.Util.include(appBase+'wn/addcontactdialog.js');
Core.Util.include(appBase+'wn/addcontactrightdialog.js');
Core.Util.include(appBase+'wn/commentviewer.js');
Core.Util.include(appBase+'wn/audioplayer.js');
Core.Util.include(appBase+'wn/videoplayer.js');

// include radio app
Core.Util.include(appBase+'radio/app.js');
Core.Util.include(appBase+'radio/preview.js');
Core.Util.include(appBase+'radio/creator.js');
Core.Util.include(appBase+'radio/wizard.js');

// include meteo app
//Core.Util.include(appBase+'weather/app.js');

// include calendar app
Core.Util.include(appBase+'calendar/app.js');
Core.Util.include(appBase+'calendar/preview.js');
Core.Util.include(appBase+'calendar/creator.js');
Core.Util.include(appBase+'calendar/wizard.js');

// include storage app
Core.Util.include(appBase+'storage/transformable.js');
//Core.Util.include(appBase+'storage/file.js');
//Core.Util.include(appBase+'storage/directory.js');
//Core.Util.include(appBase+'storage/fileviewer.js');
Core.Util.include(appBase+'storage/texteditor.js');
Core.Util.include(appBase+'storage/filepreview.js');
Core.Util.include(appBase+'storage/filepropertiesdialog.js');
Core.Util.include(appBase+'storage/preview.js');
Core.Util.include(appBase+'storage/viewer.js');
//Core.Util.include(appBase+'storage/editor.js');
Core.Util.include(appBase+'storage/creator.js');
Core.Util.include(appBase+'storage/wizard.js');

// include picasa app
Core.Util.include(appBase+'picasa/app.js');
Core.Util.include(appBase+'picasa/preview.js');
Core.Util.include(appBase+'picasa/creator.js');
Core.Util.include(appBase+'picasa/wizard.js');

// include podcast app
Core.Util.include(appBase+'podcast/app.js');
Core.Util.include(appBase+'podcast/preview.js');
Core.Util.include(appBase+'podcast/creator.js');
Core.Util.include(appBase+'podcast/wizard.js');

// include browser app
//Core.Util.include(appBase+'browser/app.js');
//Core.Util.include(appBase+'browser/preview.js');
//Core.Util.include(appBase+'browser/creator.js');
//Core.Util.include(appBase+'browser/wizard.js');

// include news app
Core.Util.include(appBase+'news/app.js');
Core.Util.include(appBase+'news/preview.js');
Core.Util.include(appBase+'news/creator.js');
Core.Util.include(appBase+'news/wizard.js');

// include login methods
Core.Util.include(appBase+'logins/local/wizard.js');
Core.Util.include(appBase+'logins/google/wizard.js');
Core.Util.include(appBase+'logins/facebook/wizard.js');
Core.Util.include(appBase+'logins/create/wizard.js');

// main app
Core.Util.include(appBase+'icons.js');
Core.Util.include(appBase+'main.js');

})();
