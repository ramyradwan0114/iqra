package app.iqra.quran;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * ============================================================
 *  مستقبِل منبّه الأذان
 * ------------------------------------------------------------
 *  أندرويد بينادي المستقبِل ده في وقت الصلاة بالظبط، وبيدّي
 *  التطبيق نافذة قصيرة يشتغل فيها حتى لو كان خامل.
 *
 *  ⚠️ نقطة حرجة: من أندرويد ١٢، التطبيق **ممنوع** يشغّل خدمة
 *  أمامية وهو في الخلفية — إلا في استثناءات محدودة. واحد من
 *  الاستثناءات دي هو إنه بيرد على **منبّه مضبوط**. عشان كده
 *  لازم الجدولة تكون بـ setAlarmClock أو
 *  setExactAndAllowWhileIdle، وإلا تشغيل الخدمة هنا هيرمي
 *  استثناء والأذان مايشتغلش.
 *
 *  ونفس المستقبِل بيتعامل مع إعادة تشغيل الموبايل: المنبّهات
 *  بتتمسح عند إعادة التشغيل، فلازم نعيد جدولتها.
 * ============================================================
 */
public class AthanReceiver extends BroadcastReceiver {

  public static final String EXTRA_SOUND = "sound";
  public static final String EXTRA_LABEL = "label";

  @Override
  public void onReceive(Context context, Intent intent) {
    String action = intent != null ? intent.getAction() : null;

    if (Intent.ACTION_BOOT_COMPLETED.equals(action)
        || "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action)
        || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
      // المنبّهات المحفوظة بتترجع من نفس المكان اللي اتخزّنت فيه.
      AthanAlarms.rescheduleAll(context);
      return;
    }

    String sound = intent != null ? intent.getStringExtra(EXTRA_SOUND) : null;
    String label = intent != null ? intent.getStringExtra(EXTRA_LABEL) : null;

    try {
      AthanService.start(context, sound, label);
    } catch (Exception ignored) {
      // لو النظام رفض تشغيل الخدمة لأي سبب، مانكسّرش التطبيق.
      // المنبّهات الباقية بتفضل مجدولة زي ما هي.
    }

    // المنبّه اللي اشتغل اتشال من النظام تلقائيًا، فبنعيد بناء
    // الجدول عشان نفضّل مغطّيين الأيام الجاية.
    try {
      AthanAlarms.rescheduleAll(context);
    } catch (Exception ignored) {
    }
  }
}
