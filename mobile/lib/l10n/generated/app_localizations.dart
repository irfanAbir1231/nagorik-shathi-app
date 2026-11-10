import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_bn.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('bn'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'Shebar Janala'**
  String get appName;

  /// No description provided for @signInTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInTitle;

  /// No description provided for @phoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get phoneLabel;

  /// No description provided for @phoneHint.
  ///
  /// In en, this message translates to:
  /// **'01XXXXXXXXX'**
  String get phoneHint;

  /// No description provided for @pinLabel.
  ///
  /// In en, this message translates to:
  /// **'PIN'**
  String get pinLabel;

  /// No description provided for @signInButton.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInButton;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @welcomeUser.
  ///
  /// In en, this message translates to:
  /// **'Welcome, {name}'**
  String welcomeUser(String name);

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @errRequired.
  ///
  /// In en, this message translates to:
  /// **'This field is required.'**
  String get errRequired;

  /// No description provided for @errPin.
  ///
  /// In en, this message translates to:
  /// **'Your PIN must be 4 to 6 digits.'**
  String get errPin;

  /// No description provided for @errNetwork.
  ///
  /// In en, this message translates to:
  /// **'No connection. Check your internet and try again.'**
  String get errNetwork;

  /// No description provided for @errTimeout.
  ///
  /// In en, this message translates to:
  /// **'The server is taking too long. Please try again.'**
  String get errTimeout;

  /// No description provided for @errPinInvalid.
  ///
  /// In en, this message translates to:
  /// **'Wrong mobile number or PIN.'**
  String get errPinInvalid;

  /// No description provided for @errAccountLocked.
  ///
  /// In en, this message translates to:
  /// **'Too many wrong attempts. Your account is locked for a while.'**
  String get errAccountLocked;

  /// No description provided for @errPhoneNotRegistered.
  ///
  /// In en, this message translates to:
  /// **'This number is not registered.'**
  String get errPhoneNotRegistered;

  /// No description provided for @errRateLimited.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Please wait a moment.'**
  String get errRateLimited;

  /// No description provided for @errUnauthenticated.
  ///
  /// In en, this message translates to:
  /// **'Your session has expired. Please sign in again.'**
  String get errUnauthenticated;

  /// No description provided for @errGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errGeneric;

  /// No description provided for @errReference.
  ///
  /// In en, this message translates to:
  /// **'Reference: {id}'**
  String errReference(String id);

  /// No description provided for @aiSimulated.
  ///
  /// In en, this message translates to:
  /// **'Simulated AI'**
  String get aiSimulated;

  /// No description provided for @aiLive.
  ///
  /// In en, this message translates to:
  /// **'Live AI'**
  String get aiLive;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navOpportunities.
  ///
  /// In en, this message translates to:
  /// **'Programmes'**
  String get navOpportunities;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @searchHint.
  ///
  /// In en, this message translates to:
  /// **'Search programmes'**
  String get searchHint;

  /// No description provided for @allCategories.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get allCategories;

  /// No description provided for @catScholarship.
  ///
  /// In en, this message translates to:
  /// **'Scholarship'**
  String get catScholarship;

  /// No description provided for @catHealthcare.
  ///
  /// In en, this message translates to:
  /// **'Healthcare'**
  String get catHealthcare;

  /// No description provided for @catAgriculture.
  ///
  /// In en, this message translates to:
  /// **'Agriculture'**
  String get catAgriculture;

  /// No description provided for @catBusiness.
  ///
  /// In en, this message translates to:
  /// **'Business'**
  String get catBusiness;

  /// No description provided for @catLegalAid.
  ///
  /// In en, this message translates to:
  /// **'Legal aid'**
  String get catLegalAid;

  /// No description provided for @catEmployment.
  ///
  /// In en, this message translates to:
  /// **'Employment'**
  String get catEmployment;

  /// No description provided for @catFinancial.
  ///
  /// In en, this message translates to:
  /// **'Financial'**
  String get catFinancial;

  /// No description provided for @catSocialWelfare.
  ///
  /// In en, this message translates to:
  /// **'Social welfare'**
  String get catSocialWelfare;

  /// No description provided for @catTraining.
  ///
  /// In en, this message translates to:
  /// **'Training'**
  String get catTraining;

  /// No description provided for @catDisaster.
  ///
  /// In en, this message translates to:
  /// **'Disaster relief'**
  String get catDisaster;

  /// No description provided for @catResearch.
  ///
  /// In en, this message translates to:
  /// **'Research'**
  String get catResearch;

  /// No description provided for @eligEligible.
  ///
  /// In en, this message translates to:
  /// **'You may qualify'**
  String get eligEligible;

  /// No description provided for @eligPartial.
  ///
  /// In en, this message translates to:
  /// **'Partly matches'**
  String get eligPartial;

  /// No description provided for @eligNotEligible.
  ///
  /// In en, this message translates to:
  /// **'Not a match'**
  String get eligNotEligible;

  /// No description provided for @eligUnknown.
  ///
  /// In en, this message translates to:
  /// **'Need more info'**
  String get eligUnknown;

  /// No description provided for @eligScore.
  ///
  /// In en, this message translates to:
  /// **'{score}% match'**
  String eligScore(int score);

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retry;

  /// No description provided for @noResults.
  ///
  /// In en, this message translates to:
  /// **'No programmes found.'**
  String get noResults;

  /// No description provided for @loadMoreFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load more.'**
  String get loadMoreFailed;

  /// No description provided for @perMonth.
  ///
  /// In en, this message translates to:
  /// **'{amount} / month'**
  String perMonth(String amount);

  /// No description provided for @perQuarter.
  ///
  /// In en, this message translates to:
  /// **'{amount} / quarter'**
  String perQuarter(String amount);

  /// No description provided for @oneTime.
  ///
  /// In en, this message translates to:
  /// **'{amount} one-time'**
  String oneTime(String amount);

  /// No description provided for @amountOnly.
  ///
  /// In en, this message translates to:
  /// **'{amount}'**
  String amountOnly(String amount);

  /// No description provided for @deadlineOn.
  ///
  /// In en, this message translates to:
  /// **'Deadline: {date}'**
  String deadlineOn(String date);

  /// No description provided for @secDescription.
  ///
  /// In en, this message translates to:
  /// **'About this programme'**
  String get secDescription;

  /// No description provided for @secBenefits.
  ///
  /// In en, this message translates to:
  /// **'What you get'**
  String get secBenefits;

  /// No description provided for @secHowToApply.
  ///
  /// In en, this message translates to:
  /// **'How to apply'**
  String get secHowToApply;

  /// No description provided for @secDocuments.
  ///
  /// In en, this message translates to:
  /// **'Documents you need'**
  String get secDocuments;

  /// No description provided for @secWhyEligible.
  ///
  /// In en, this message translates to:
  /// **'Why this result'**
  String get secWhyEligible;

  /// No description provided for @secProvider.
  ///
  /// In en, this message translates to:
  /// **'Provided by'**
  String get secProvider;

  /// No description provided for @secTrust.
  ///
  /// In en, this message translates to:
  /// **'How sure are we'**
  String get secTrust;

  /// No description provided for @requiredDoc.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get requiredDoc;

  /// No description provided for @optionalDoc.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get optionalDoc;

  /// No description provided for @tipLabel.
  ///
  /// In en, this message translates to:
  /// **'Tip'**
  String get tipLabel;

  /// No description provided for @commonMistakeLabel.
  ///
  /// In en, this message translates to:
  /// **'Common mistake'**
  String get commonMistakeLabel;

  /// No description provided for @verifUnverified.
  ///
  /// In en, this message translates to:
  /// **'Sample data, not yet verified'**
  String get verifUnverified;

  /// No description provided for @verifPending.
  ///
  /// In en, this message translates to:
  /// **'Awaiting official check'**
  String get verifPending;

  /// No description provided for @verifVerified.
  ///
  /// In en, this message translates to:
  /// **'Verified'**
  String get verifVerified;

  /// No description provided for @verifOutdated.
  ///
  /// In en, this message translates to:
  /// **'May be out of date'**
  String get verifOutdated;

  /// No description provided for @verifDisputed.
  ///
  /// In en, this message translates to:
  /// **'Source disputed — check the office'**
  String get verifDisputed;

  /// No description provided for @confHigh.
  ///
  /// In en, this message translates to:
  /// **'High confidence'**
  String get confHigh;

  /// No description provided for @confMedium.
  ///
  /// In en, this message translates to:
  /// **'Medium confidence'**
  String get confMedium;

  /// No description provided for @confLow.
  ///
  /// In en, this message translates to:
  /// **'Low confidence'**
  String get confLow;

  /// No description provided for @ruleMet.
  ///
  /// In en, this message translates to:
  /// **'Matches'**
  String get ruleMet;

  /// No description provided for @ruleFailed.
  ///
  /// In en, this message translates to:
  /// **'Does not match'**
  String get ruleFailed;

  /// No description provided for @ruleUnknown.
  ///
  /// In en, this message translates to:
  /// **'Unknown'**
  String get ruleUnknown;

  /// No description provided for @recommendedForYou.
  ///
  /// In en, this message translates to:
  /// **'Programmes for you'**
  String get recommendedForYou;

  /// No description provided for @noRecommendations.
  ///
  /// In en, this message translates to:
  /// **'No matches yet. Complete your profile to get better results.'**
  String get noRecommendations;

  /// No description provided for @browseAll.
  ///
  /// In en, this message translates to:
  /// **'Browse all programmes'**
  String get browseAll;

  /// No description provided for @officeHours.
  ///
  /// In en, this message translates to:
  /// **'Office hours'**
  String get officeHours;

  /// No description provided for @phoneLabelShort.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phoneLabelShort;

  /// No description provided for @processingTime.
  ///
  /// In en, this message translates to:
  /// **'Processing time'**
  String get processingTime;

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'Your account'**
  String get profileTitle;

  /// No description provided for @phoneValue.
  ///
  /// In en, this message translates to:
  /// **'Phone: {phone}'**
  String phoneValue(String phone);

  /// No description provided for @districtValue.
  ///
  /// In en, this message translates to:
  /// **'District: {district}'**
  String districtValue(String district);

  /// No description provided for @navAsk.
  ///
  /// In en, this message translates to:
  /// **'Ask'**
  String get navAsk;

  /// No description provided for @chatTitle.
  ///
  /// In en, this message translates to:
  /// **'Ask'**
  String get chatTitle;

  /// No description provided for @chatHint.
  ///
  /// In en, this message translates to:
  /// **'Type your question'**
  String get chatHint;

  /// No description provided for @chatSend.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get chatSend;

  /// No description provided for @chatNew.
  ///
  /// In en, this message translates to:
  /// **'New chat'**
  String get chatNew;

  /// No description provided for @chatHistory.
  ///
  /// In en, this message translates to:
  /// **'Past chats'**
  String get chatHistory;

  /// No description provided for @chatNoHistory.
  ///
  /// In en, this message translates to:
  /// **'No past chats yet.'**
  String get chatNoHistory;

  /// No description provided for @chatEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'How can we help?'**
  String get chatEmptyTitle;

  /// No description provided for @chatEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Ask in Bangla or English about benefits, allowances, scholarships and services.'**
  String get chatEmptyBody;

  /// No description provided for @chatSuggestion1.
  ///
  /// In en, this message translates to:
  /// **'My husband passed away. What help can I get?'**
  String get chatSuggestion1;

  /// No description provided for @chatSuggestion2.
  ///
  /// In en, this message translates to:
  /// **'I am a farmer. What support is there?'**
  String get chatSuggestion2;

  /// No description provided for @chatSuggestion3.
  ///
  /// In en, this message translates to:
  /// **'Are there scholarships for students?'**
  String get chatSuggestion3;

  /// No description provided for @chatNotSent.
  ///
  /// In en, this message translates to:
  /// **'Not sent. Tap to try again.'**
  String get chatNotSent;

  /// No description provided for @chatSending.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get chatSending;

  /// No description provided for @chatThinking.
  ///
  /// In en, this message translates to:
  /// **'Looking for programmes…'**
  String get chatThinking;

  /// No description provided for @chatSimulatedNote.
  ///
  /// In en, this message translates to:
  /// **'Simulated AI. Eligibility decisions are the same as with live AI.'**
  String get chatSimulatedNote;

  /// No description provided for @chatNextStep.
  ///
  /// In en, this message translates to:
  /// **'Next step'**
  String get chatNextStep;

  /// No description provided for @chatViewProgramme.
  ///
  /// In en, this message translates to:
  /// **'View programme'**
  String get chatViewProgramme;

  /// No description provided for @errAiUnavailable.
  ///
  /// In en, this message translates to:
  /// **'The assistant is busy or took too long. Your message was kept. Please try again.'**
  String get errAiUnavailable;

  /// No description provided for @voiceStart.
  ///
  /// In en, this message translates to:
  /// **'Speak'**
  String get voiceStart;

  /// No description provided for @voiceStop.
  ///
  /// In en, this message translates to:
  /// **'Stop and use what I said'**
  String get voiceStop;

  /// No description provided for @voiceListening.
  ///
  /// In en, this message translates to:
  /// **'Listening… tap to finish'**
  String get voiceListening;

  /// No description provided for @voiceTranscribing.
  ///
  /// In en, this message translates to:
  /// **'Working out what you said…'**
  String get voiceTranscribing;

  /// No description provided for @voiceErrPermission.
  ///
  /// In en, this message translates to:
  /// **'Microphone access is off. Turn it on in your phone\'s settings, or type instead.'**
  String get voiceErrPermission;

  /// No description provided for @voiceErrUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Voice typing is not available on this phone or server. Please type instead.'**
  String get voiceErrUnavailable;

  /// No description provided for @voiceErrLocale.
  ///
  /// In en, this message translates to:
  /// **'This phone has no Bangla speech pack installed. Install it in Google settings, or type instead.'**
  String get voiceErrLocale;

  /// No description provided for @voiceErrNoSpeech.
  ///
  /// In en, this message translates to:
  /// **'We did not hear anything. Tap the microphone and try again.'**
  String get voiceErrNoSpeech;

  /// No description provided for @voiceErrServer.
  ///
  /// In en, this message translates to:
  /// **'Could not turn your voice into text. Please try again, or type.'**
  String get voiceErrServer;

  /// No description provided for @readAloud.
  ///
  /// In en, this message translates to:
  /// **'Read aloud'**
  String get readAloud;

  /// No description provided for @stopReading.
  ///
  /// In en, this message translates to:
  /// **'Stop reading'**
  String get stopReading;

  /// No description provided for @navSaved.
  ///
  /// In en, this message translates to:
  /// **'My list'**
  String get navSaved;

  /// No description provided for @savedTab.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get savedTab;

  /// No description provided for @plansTab.
  ///
  /// In en, this message translates to:
  /// **'Plans'**
  String get plansTab;

  /// No description provided for @savedEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing saved yet. Tap the bookmark on a programme to keep it here.'**
  String get savedEmpty;

  /// No description provided for @plansEmpty.
  ///
  /// In en, this message translates to:
  /// **'No plans yet. Open a programme and tap \"Make a plan\" to get a step-by-step checklist.'**
  String get plansEmpty;

  /// No description provided for @saveProgramme.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get saveProgramme;

  /// No description provided for @unsaveProgramme.
  ///
  /// In en, this message translates to:
  /// **'Remove from saved'**
  String get unsaveProgramme;

  /// No description provided for @savedToast.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get savedToast;

  /// No description provided for @removedToast.
  ///
  /// In en, this message translates to:
  /// **'Removed from saved'**
  String get removedToast;

  /// No description provided for @undo.
  ///
  /// In en, this message translates to:
  /// **'Undo'**
  String get undo;

  /// No description provided for @makePlan.
  ///
  /// In en, this message translates to:
  /// **'Make a plan'**
  String get makePlan;

  /// No description provided for @openPlan.
  ///
  /// In en, this message translates to:
  /// **'Open my plan'**
  String get openPlan;

  /// No description provided for @changeStatus.
  ///
  /// In en, this message translates to:
  /// **'Where are you with this?'**
  String get changeStatus;

  /// No description provided for @allStatuses.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get allStatuses;

  /// No description provided for @statusInterested.
  ///
  /// In en, this message translates to:
  /// **'Interested'**
  String get statusInterested;

  /// No description provided for @statusPreparing.
  ///
  /// In en, this message translates to:
  /// **'Preparing'**
  String get statusPreparing;

  /// No description provided for @statusDocsReady.
  ///
  /// In en, this message translates to:
  /// **'Documents ready'**
  String get statusDocsReady;

  /// No description provided for @statusApplied.
  ///
  /// In en, this message translates to:
  /// **'Applied'**
  String get statusApplied;

  /// No description provided for @statusUnderReview.
  ///
  /// In en, this message translates to:
  /// **'Under review'**
  String get statusUnderReview;

  /// No description provided for @statusApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get statusApproved;

  /// No description provided for @statusRejected.
  ///
  /// In en, this message translates to:
  /// **'Not approved'**
  String get statusRejected;

  /// No description provided for @statusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get statusCompleted;

  /// No description provided for @progressOf.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total} done'**
  String progressOf(int done, int total);

  /// No description provided for @priorityHigh.
  ///
  /// In en, this message translates to:
  /// **'High priority'**
  String get priorityHigh;

  /// No description provided for @priorityMedium.
  ///
  /// In en, this message translates to:
  /// **'Medium priority'**
  String get priorityMedium;

  /// No description provided for @priorityLow.
  ///
  /// In en, this message translates to:
  /// **'Low priority'**
  String get priorityLow;

  /// No description provided for @dueOn.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String dueOn(String date);

  /// No description provided for @minutesShort.
  ///
  /// In en, this message translates to:
  /// **'{n} min'**
  String minutesShort(int n);

  /// No description provided for @taskUpdateFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not update that step. Please try again.'**
  String get taskUpdateFailed;

  /// No description provided for @planTitle.
  ///
  /// In en, this message translates to:
  /// **'Your plan'**
  String get planTitle;

  /// No description provided for @markDone.
  ///
  /// In en, this message translates to:
  /// **'Mark done'**
  String get markDone;

  /// No description provided for @markNotDone.
  ///
  /// In en, this message translates to:
  /// **'Mark not done'**
  String get markNotDone;

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create an account'**
  String get createAccount;

  /// No description provided for @forgotPin.
  ///
  /// In en, this message translates to:
  /// **'Forgot your PIN?'**
  String get forgotPin;

  /// No description provided for @signInWithCode.
  ///
  /// In en, this message translates to:
  /// **'Sign in with a code instead'**
  String get signInWithCode;

  /// No description provided for @haveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? Sign in'**
  String get haveAccount;

  /// No description provided for @registerTitle.
  ///
  /// In en, this message translates to:
  /// **'Create your account'**
  String get registerTitle;

  /// No description provided for @resetPinTitle.
  ///
  /// In en, this message translates to:
  /// **'Set a new PIN'**
  String get resetPinTitle;

  /// No description provided for @otpLoginTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in with a code'**
  String get otpLoginTitle;

  /// No description provided for @sendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get sendCode;

  /// No description provided for @codeSentTo.
  ///
  /// In en, this message translates to:
  /// **'We sent a 6-digit code to {phone}.'**
  String codeSentTo(String phone);

  /// No description provided for @codeLabel.
  ///
  /// In en, this message translates to:
  /// **'6-digit code'**
  String get codeLabel;

  /// No description provided for @nameLabel.
  ///
  /// In en, this message translates to:
  /// **'Your name'**
  String get nameLabel;

  /// No description provided for @nameHelp.
  ///
  /// In en, this message translates to:
  /// **'As it appears on your National ID'**
  String get nameHelp;

  /// No description provided for @newPinLabel.
  ///
  /// In en, this message translates to:
  /// **'Choose a PIN (4 to 6 digits)'**
  String get newPinLabel;

  /// No description provided for @confirmPinLabel.
  ///
  /// In en, this message translates to:
  /// **'Type the PIN again'**
  String get confirmPinLabel;

  /// No description provided for @pinMismatch.
  ///
  /// In en, this message translates to:
  /// **'The two PINs are not the same.'**
  String get pinMismatch;

  /// No description provided for @errPhone.
  ///
  /// In en, this message translates to:
  /// **'Enter an 11-digit number starting with 01.'**
  String get errPhone;

  /// No description provided for @errName.
  ///
  /// In en, this message translates to:
  /// **'Enter your name (at least 2 letters).'**
  String get errName;

  /// No description provided for @errCode.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-digit code.'**
  String get errCode;

  /// No description provided for @resendIn.
  ///
  /// In en, this message translates to:
  /// **'Send again in {seconds}s'**
  String resendIn(int seconds);

  /// No description provided for @resendCode.
  ///
  /// In en, this message translates to:
  /// **'Send the code again'**
  String get resendCode;

  /// No description provided for @devCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'Development only. Code: {code}'**
  String devCodeLabel(String code);

  /// No description provided for @chooseLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get chooseLanguage;

  /// No description provided for @finishRegister.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get finishRegister;

  /// No description provided for @finishResetPin.
  ///
  /// In en, this message translates to:
  /// **'Save PIN and sign in'**
  String get finishResetPin;

  /// No description provided for @finishOtpLogin.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get finishOtpLogin;

  /// No description provided for @changeNumber.
  ///
  /// In en, this message translates to:
  /// **'Use a different number'**
  String get changeNumber;

  /// No description provided for @errValidation.
  ///
  /// In en, this message translates to:
  /// **'Please check what you entered.'**
  String get errValidation;

  /// No description provided for @errOtpInvalid.
  ///
  /// In en, this message translates to:
  /// **'That code is not right. Check it and try again.'**
  String get errOtpInvalid;

  /// No description provided for @errOtpExpired.
  ///
  /// In en, this message translates to:
  /// **'That code has expired. Ask for a new one.'**
  String get errOtpExpired;

  /// No description provided for @errOtpAttempts.
  ///
  /// In en, this message translates to:
  /// **'Too many wrong codes. Ask for a new one.'**
  String get errOtpAttempts;

  /// No description provided for @errPhoneExists.
  ///
  /// In en, this message translates to:
  /// **'This number already has an account. Sign in instead.'**
  String get errPhoneExists;

  /// No description provided for @errPinWeak.
  ///
  /// In en, this message translates to:
  /// **'That PIN is too easy to guess. Avoid 1234 or repeated digits like 1111.'**
  String get errPinWeak;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['bn', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'bn':
      return AppLocalizationsBn();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
