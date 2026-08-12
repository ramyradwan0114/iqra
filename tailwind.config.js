/** @type {import('tailwindcss').Config} */
export default {
  // الوضع الليلي بيتفعّل بإضافة class="dark" على <html> — مش بتفضيل النظام،
  // عشان زرار التبديل في التطبيق يكون هو المتحكّم.
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0F5C4C",
        secondary: "#E7C873",
        bg: "#F6F1E4",
        text: "#1E2A24",
        // درجات مساندة مستخدمة في التطبيق
        surface: "#FBF8EF",
        card: "#FFFDF6",
        line: "#E4DCC3",
        muted: "#5B6B62",
        gold: "#8A7A4E",
        danger: "#8A4E4E",
      },
      fontFamily: {
        ui: ['"Amiri"', '"Traditional Arabic"', "serif"],
        quran: ['"Amiri Quran"', '"Amiri"', '"Traditional Arabic"', "serif"],
      },
      // مهم: التطبيق بيستخدم bg-[#0F5C4C]/8 و /15، والاتنين مش موجودين في
      // سلّم الشفافية الافتراضي (0,5,10,20,25,...). من غير السطرين دول
      // الكلاسات دي مابتطلعش أي خلفية — تختفي في صمت.
      opacity: {
        8: "0.08",
        15: "0.15",
      },
    },
  },
  plugins: [],
};
