/**
 * Shared UX copy for student auth — one terminology glossary across all auth pages.
 * Voice: friendly campus companion; audience: Thai secondary students.
 */

export const AUTH_COPY = {
  /** Field labels */
  studentIdField: "เลขประจำตัว (5 หลัก)",
  pinField: "PIN 6 หลัก",
  confirmPinField: "ยืนยัน PIN",
  passwordField: "รหัสผ่าน",
  confirmPasswordField: "ยืนยันรหัสผ่าน",
  confirmNewPasswordField: "ยืนยันรหัสผ่านใหม่",
  currentPasswordField: "รหัสผ่านปัจจุบัน",
  newPasswordField: "รหัสผ่านใหม่",
  schoolPasswordField: "รหัสผ่านจากโรงเรียน",

  /** Hints */
  passwordRules: "อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข",
  pinQuickUnlock: "ใช้แทนรหัสผ่านเมื่อเปิดแอปบนเครื่องนี้",
  registerStudentIdHint:
    "กรอกเลขที่โรงเรียนแจ้ง ระบบจะแสดงชื่อและห้องให้ตรวจสอบก่อนดำเนินการต่อ",
  schoolPasswordHint:
    "รหัสชั่วคราวที่โรงเรียนแจก — สำหรับบัญชีที่ยังไม่เคยตั้งรหัสผ่านเอง",
  profileMismatchHint: "ข้อมูลไม่ตรง? ลอง \"แก้ไขเลขประจำตัว\" ด้านล่าง หรือติดต่อผู้ดูแลระบบ",

  /** Primary actions */
  signIn: "เข้าสู่ระบบ",
  signInWithPasskey: "เข้าสู่ระบบด้วย Passkey",
  verifyWithPasskey: "ยืนยันด้วย Passkey",
  verifyWithPassword: "ยืนยันด้วยรหัสผ่าน",
  savePassword: "บันทึกรหัสผ่าน",
  saveNewPassword: "บันทึกรหัสผ่านใหม่",
  savePin: "บันทึก PIN",
  registerFirstTime: "สมัครสมาชิกครั้งแรก",
  startUsing: "เริ่มใช้งาน",
  searchStudent: "ค้นหาข้อมูล",
  confirmProfile: "ดำเนินการต่อ",

  /** Navigation & recovery */
  backToSignIn: "กลับหน้าเข้าสู่ระบบ",
  backToHub: "กลับ",
  forgotPin: "ลืม PIN?",
  forgotPinTitle: "ลืม PIN",
  forgotPassword: "ลืมรหัสผ่าน?",
  useOtherAccount: "ใช้บัญชีอื่น",
  signInWithPassword: "เข้าด้วยเลขประจำตัวและรหัสผ่าน",
  backToPinSignIn: "กลับไปเข้าด้วย PIN",
  notMeEditId: "แก้ไขเลขประจำตัว",
  hasAccountSignIn: "มีบัญชีแล้ว? เข้าสู่ระบบ",
  noAccountRegister: "ยังไม่มีบัญชี?",
  noAccountRegisterLink: "ยังไม่ได้สมัคร? เริ่มใช้งานที่นี่",

  /** Student verification gate (OAuth users without student profile) */
  studentVerificationTitle: "ยืนยันบัญชีนักเรียน",
  studentVerificationDescription:
    "บัญชีของคุณยังไม่ได้ยืนยัน กรุณาสมัครหรือเชื่อมบัญชีนักเรียนเพื่อใช้งานต่อ",
  goToRegister: "ไปหน้าสมัครสมาชิก",
  signInWithOtherAccount: "เข้าสู่ระบบด้วยบัญชีอื่น",

  /** Hub & headers */
  hubTitle: "ยินดีต้อนรับ",
  hubDescription: "ยังไม่มีบัญชี? สมัครเพื่อเริ่มใช้ หรือเข้าสู่ระบบหากมีบัญชีแล้ว",
  signInDescription: "ใช้เลขประจำตัวกับรหัสผ่าน หรือ Passkey",
  resetPasswordDescription:
    "ยืนยันตัวตนด้วย PIN หรือรหัสจากโรงเรียน แล้วตั้งรหัสผ่านใหม่",
  forgotPinDescription: "ยืนยันตัวตนก่อนตั้ง PIN ใหม่",
  setupPinDescription:
    "ครั้งถัดไปที่เปิดแอปบนเครื่องนี้ ใช้ PIN 6 หลักแทนรหัสผ่านได้",
  setupPinResetDescription: "ตั้ง PIN ใหม่สำหรับเข้าสู่ระบบอย่างรวดเร็ว",
  mustChangePasswordDescription:
    "ครั้งแรกที่เข้าใช้งาน กรุณาเปลี่ยนรหัสผ่านจากโรงเรียนเป็นรหัสของคุณเอง",
  changePasswordDescription: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัว พร้อมตัวอักษรและตัวเลข",

  profilePanelTitle: "ข้อมูลของคุณในระบบ",
  fullNameLabel: "ชื่อ-นามสกุล",
  studentIdMetaPrefix: "เลขประจำตัว",
  gradeLevelLabel: "ระดับชั้น",
  roomLabel: "ห้อง",
  nextStep: "ถัดไป",
  backStep: "ย้อนกลับ",

  /** Page titles */
  changePasswordTitle: "เปลี่ยนรหัสผ่าน",
  setNewPasswordTitle: "ตั้งรหัสผ่านใหม่",
  resetPasswordTitle: "รีเซ็ตรหัสผ่าน",
  setPinTitle: "ตั้ง PIN สำหรับเข้าใช้งานครั้งถัดไป",
  setPinResetTitle: "ตั้ง PIN ใหม่",
  tabVerifyPin: "ใช้ PIN",
  tabSchoolPassword: "รหัสโรงเรียน",

  /** Register flow */
  registerTitle: "เริ่มใช้งาน",
  registerSubtitle: "สมัครสมาชิก",
  registerDescription: "สมัครสมาชิกเพื่อใช้งานระบบของโรงเรียน",
  registerStepStudentId: "เลขประจำตัว",
  registerStepConfirm: "ยืนยันตัวตน",
  registerStepPassword: "รหัสผ่าน",
  registerStepPin: "ตั้ง PIN",

  /** Recovery help */
  forgotBothCredentials: "ลืมทั้งรหัสผ่านและ PIN?",
  forgotBothHelp: "ติดต่อครูผู้ดูแลระบบของโรงเรียนเพื่อขอความช่วยเหลือ",

  /** Loading */
  loadingAccount: "กำลังตรวจสอบบัญชี…",
  loading: "กำลังโหลด…",

  /** Banners */
  setupCompleteBanner:
    "ตั้งค่าระบบเสร็จแล้ว — เข้าสู่ระบบด้วยบัญชีแอดมินที่สร้างไว้",

  /** Form-level errors (fallback when API message is unavailable) */
  signInFailed:
    "เข้าสู่ระบบไม่ได้ ตรวจสอบเลขประจำตัวและรหัสผ่านแล้วลองอีกครั้ง",
  pinIncorrect: "PIN ไม่ถูกต้อง ลองใหม่หรือกด「ลืม PIN?」",
  passkeyFailed: "ยืนยันด้วย Passkey ไม่สำเร็จ ลองอีกครั้งหรือใช้รหัสผ่าน",
  verificationFailed: "ยืนยันตัวตนไม่ได้ ตรวจสอบข้อมูลแล้วลองอีกครั้ง",
  resetPasswordFailed: "ตั้งรหัสผ่านใหม่ไม่สำเร็จ ลองอีกครั้ง",
  changePasswordFailed: "บันทึกรหัสผ่านไม่สำเร็จ ลองอีกครั้ง",
  setupPinFailed: "บันทึก PIN ไม่สำเร็จ ลองอีกครั้ง",
  lookupFailed: "ค้นหาข้อมูลไม่ได้ ตรวจสอบเลขประจำตัวแล้วลองอีกครั้ง",
  registerFailed: "สมัครสมาชิกไม่สำเร็จ ลองอีกครั้ง",
  studentIdNotFound:
    "ไม่พบเลขประจำตัวนี้ ตรวจสอบตัวเลขแล้วลองอีกครั้ง หรือติดต่อครูผู้ดูแลระบบ",
  alreadyRegistered: "บัญชีนี้สมัครแล้ว — เข้าสู่ระบบได้เลย",
  cannotRegister: "สมัครสมาชิกไม่ได้ในขณะนี้ ติดต่อครูผู้ดูแลระบบ",
  oauthSignInFailed: "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้งหรือใช้วิธีอื่น",
} as const;
