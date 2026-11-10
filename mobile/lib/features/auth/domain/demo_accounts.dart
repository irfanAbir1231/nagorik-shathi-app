import '../../opportunities/domain/opportunity.dart';

/// A seeded demo account, offered on the sign-in screen so a tester can pick a
/// role instead of typing a phone number and PIN.
///
/// DEBUG BUILDS ONLY. These are the accounts created by the backend's
/// `npm run db:seed` (scripts/seed.ts) and exist only in a development
/// database. The sign-in screen references this list only behind `kDebugMode`,
/// so release builds do not carry the credentials.
class DemoAccount {
  const DemoAccount({
    required this.role,
    required this.name,
    required this.phone,
    required this.pin,
    required this.detail,
  });

  /// What this account is for: the role a tester is trying out.
  final Bilingual role;

  /// The person the seed gave this account to.
  final String name;
  final String phone;
  final String pin;
  final Bilingual detail;
}

const demoAccounts = <DemoAccount>[
  DemoAccount(
    role: Bilingual('Citizen: widow', 'নাগরিক: বিধবা নারী'),
    name: 'রহিমা বেগম',
    phone: '01712345678',
    pin: '1234',
    detail: Bilingual('Rangpur, Bangla. Beneficiary with a verified record.', 'রংপুর, বাংলা। যাচাইকৃত উপকারভোগী।'),
  ),
  DemoAccount(
    role: Bilingual('Citizen: student', 'নাগরিক: শিক্ষার্থী'),
    name: 'Tanvir Ahmed',
    phone: '01812345678',
    pin: '1234',
    detail: Bilingual('Rajshahi, English interface.', 'রাজশাহী, ইংরেজি ইন্টারফেস।'),
  ),
  DemoAccount(
    role: Bilingual('Citizen: farmer', 'নাগরিক: কৃষক'),
    name: 'করিম মিয়া',
    phone: '01912345678',
    pin: '1234',
    detail: Bilingual('Kurigram, Bangla.', 'কুড়িগ্রাম, বাংলা।'),
  ),
  DemoAccount(
    role: Bilingual('Citizen: resident', 'নাগরিক: বাসিন্দা'),
    name: 'মিনা আক্তার',
    phone: '01711112222',
    pin: '1234',
    detail: Bilingual('Kaligonj resident, Rangpur.', 'কালীগঞ্জের বাসিন্দা, রংপুর।'),
  ),
  DemoAccount(
    role: Bilingual('Union chairman', 'ইউনিয়ন চেয়ারম্যান'),
    name: 'মোঃ জসিম উদ্দিন',
    phone: '01911112222',
    pin: '1234',
    detail: Bilingual('Kaligonj union, Rangpur.', 'কালীগঞ্জ ইউনিয়ন, রংপুর।'),
  ),
  DemoAccount(
    role: Bilingual('Upazila officer', 'উপজেলা কর্মকর্তা'),
    name: 'নাজমা সুলতানা',
    phone: '01611112222',
    pin: '1234',
    detail: Bilingual('Rangpur Sadar upazila.', 'রংপুর সদর উপজেলা।'),
  ),
  DemoAccount(
    role: Bilingual('Union staff', 'ইউনিয়ন কর্মী'),
    name: 'সোহেল রানা',
    phone: '01411112222',
    pin: '1234',
    detail: Bilingual('Mominpur union, Rangpur.', 'মমিনপুর ইউনিয়ন, রংপুর।'),
  ),
  DemoAccount(
    role: Bilingual('Donor representative', 'দাতা প্রতিনিধি'),
    name: 'Nasreen Chowdhury',
    phone: '01511112222',
    pin: '1234',
    detail: Bilingual('UNDP Bangladesh, English interface.', 'ইউএনডিপি বাংলাদেশ, ইংরেজি ইন্টারফেস।'),
  ),
  DemoAccount(
    role: Bilingual('Moderator', 'মডারেটর'),
    name: 'Shebar Janala Moderator',
    phone: '01612345678',
    pin: '4321',
    detail: Bilingual('Can triage content, cannot publish.', 'বিষয়বস্তু যাচাই করতে পারেন, প্রকাশ নয়।'),
  ),
  DemoAccount(
    role: Bilingual('Administrator', 'প্রশাসক'),
    name: 'Shebar Janala Administrator',
    phone: '01512345678',
    pin: '4321',
    detail: Bilingual('Can verify records and manage the platform.', 'তথ্য যাচাই ও প্ল্যাটফর্ম পরিচালনা করতে পারেন।'),
  ),
];

DemoAccount? demoAccountForPhone(String phone) {
  for (final a in demoAccounts) {
    if (a.phone == phone) return a;
  }
  return null;
}
