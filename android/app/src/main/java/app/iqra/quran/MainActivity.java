package app.iqra.quran;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

/**
 * ============================================================
 *  حشو شريط الحالة
 * ------------------------------------------------------------
 *  المشكلة: التطبيق بيستهدف API 36، ومن أندرويد 15 الرسم من الحافة
 *  للحافة (edge-to-edge) **مفروض ومفيش إلغاء ليه**. يعني صفحة الويب
 *  بتترسم تحت شريط الحالة (الساعة والبطارية والواي فاي).
 *
 *  النتيجة اللي ظهرت: هيدر الدرس — وفيه زر «إغلاق ✕» — كان مرسوم
 *  تحت شريط الحالة بالظبط. اللمس بيروح لشريط النظام مش للزر،
 *  فالمستخدم بيدوس على «إغلاق» ومايحصلش حاجة، ويفضل محبوس في
 *  شاشة الدرس.
 *
 *  الحل: ناخد ارتفاع أشرطة النظام من النظام نفسه ونحطّه padding
 *  فوق المحتوى. بنقراه من WindowInsets مش برقم ثابت، لأن الارتفاع
 *  بيختلف من جهاز لجهاز (الكاميرا الثاقبة، الشاشات المنحنية).
 *
 *  ⚠️ التحت مش متحشّي هنا عن قصد — شريط التنقّل السفلي في التطبيق
 *  بيتعامل مع ده بنفسه بـ env(safe-area-inset-bottom) في CSS.
 *  لو حشينا التحت هنا كمان، هيتحسب مرتين ويبان فراغ تحت الشريط.
 * ============================================================
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    // ⚠️ لازم قبل نداء الأصل تحت: Capacitor بيبني الجسر جوّاه،
    // وأي إضافة بتتسجّل بعده مابيشوفهاش الجافاسكربت.
    registerPlugin(AthanPlugin.class);

    super.onCreate(savedInstanceState);

    final View content = findViewById(android.R.id.content);
    if (content == null) return;

    ViewCompat.setOnApplyWindowInsetsListener(content, (v, windowInsets) -> {
      Insets bars = windowInsets.getInsets(
          WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
      );
      v.setPadding(bars.left, bars.top, bars.right, 0);
      // بنرجّع الـ insets زي ما هي عشان أي عنصر جوّه يقدر يقراها برضه
      return windowInsets;
    });

    // لازم نطلب تطبيق الـ insets، وإلا مابتتحسبش غير عند أول تغيير
    ViewCompat.requestApplyInsets(content);
  }
}
