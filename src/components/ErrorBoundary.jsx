import React from "react";

// ============================================================
//  حاجز الأخطاء
// ------------------------------------------------------------
//  من غيره: أي خطأ في أي مكوّن بيفضّي الشاشة بالكامل ويسيب المستخدم
//  قدام صفحة بيضا من غير أي تفسير — وده أسوأ حاجة ممكنة في تطبيق
//  للأطفال أو لحد بيقرأ ورده.
//
//  المهم هنا إن التطبيق يفضل قابل للإنقاذ: زرار "رجوع" بيرجّع الشاشة
//  الأساسية من غير ما يمسح أي بيانات، وزرار "إعادة تحميل" للحالات
//  الأصعب. مابنمسحش IndexedDB ولا التقدّم أبدًا — البيانات على الجهاز
//  وملهاش نسخة على سيرفر، فمسحها معناه ضياعها للأبد.
// ============================================================
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // مفيش خدمة تتبّع أخطاء خارجية عن قصد — مافيش بيانات بتخرج من الجهاز.
    // الـ console كفاية عشان تشوف التفاصيل لو وصلك بلاغ.
    console.error("[اقرأ] خطأ غير متوقّع:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center p-6 bg-[#F5F0E8] dark:bg-[#1E2A24]"
      >
        <div className="iqra-card p-8 max-w-sm w-full text-center flex flex-col gap-4">
          <div className="text-4xl">🌙</div>
          <h1 className="text-lg font-bold text-[#1B4D3E] dark:text-[#D4A853]">
            حصلت مشكلة غير متوقّعة
          </h1>
          <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] leading-relaxed">
            تقدّمك وحفظك <strong>محفوظين زي ما هما</strong> على جهازك — مافيش
            حاجة ضاعت. جرّب ترجع، ولو المشكلة فضلت اعمل إعادة تحميل.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="bg-[#1B4D3E] text-[#F5F0E8] py-3 rounded-xl font-bold text-sm"
            >
              رجوع
            </button>
            <button
              onClick={() => window.location.reload()}
              className="border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2] py-3 rounded-xl font-bold text-sm"
            >
              إعادة تحميل
            </button>
          </div>

          <details className="text-right">
            <summary className="text-[11px] text-[#8A7A4E] cursor-pointer">
              تفاصيل تقنية
            </summary>
            <pre
              dir="ltr"
              className="mt-2 text-[10px] text-[#8A4E4E] bg-[#FBEDED] rounded-xl p-3 overflow-auto max-h-40 whitespace-pre-wrap"
            >
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
