import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Placeholder translations
const resources = {
  en: {
    translation: {
      "welcome": "WariSathi 🙏",
      "tagline": "Your safety companion for Wari",
      "fullName": "Full Name",
      "dindiName": "Dindi Name",
      "emergencyContactName": "Emergency Contact Name",
      "emergencyContactPhone": "Emergency Contact Phone",
      "medicalConditions": "Medical Conditions (Optional)",
      "register": "Register",
    }
  },
  mr: {
    translation: {
      "welcome": "वारीसाथी 🙏",
      "tagline": "वारीसाठी तुमचा सुरक्षितता सोबती",
      "fullName": "पूर्ण नाव",
      "dindiName": "दिंडीचे नाव",
      "emergencyContactName": "आपत्कालीन संपर्काचे नाव",
      "emergencyContactPhone": "आपत्कालीन संपर्काचा फोन",
      "medicalConditions": "वैद्यकीय परिस्थिती (पर्यायी)",
      "register": "नोंदणी करा",
    }
  },
  hi: {
    translation: {
      "welcome": "वारीसाथी 🙏",
      "tagline": "वारी के लिए आपका सुरक्षा साथी",
      "fullName": "पूरा नाम",
      "dindiName": "दिंडी का नाम",
      "emergencyContactName": "आपातकालीन संपर्क नाम",
      "emergencyContactPhone": "आपातकालीन संपर्क फोन",
      "medicalConditions": "चिकित्सा स्थिति (वैकल्पिक)",
      "register": "रजिस्टर करें",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
