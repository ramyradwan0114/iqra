package app.iqra.quran;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ============================================================
 *  جدولة منبّهات الأذان
 * ------------------------------------------------------------
 *  ليه setAlarmClock:
 *
 *  أندرويد عنده تلات مستويات للمنبّهات:
 *    set()                        → النظام بيأجّله زي ما يحب
 *    setExactAndAllowWhileIdle()  → مضبوط، بس بحصص في وضع السكون
 *    setAlarmClock()              → **معفي تمامًا** من وضع السكون
 *
 *  التالت هو اللي بتستخدمه تطبيقات المنبّه، وهو الوحيد اللي
 *  أندرويد بيضمن إنه يشتغل في وقته مهما كان الجهاز نايم. وهو
 *  كمان بيدّي التطبيق استثناء مؤقت يقدر يشغّل بيه خدمة أمامية
 *  من الخلفية — وده اللي محتاجينه عشان نشغّل الأذان.
 *
 *  ⚠️ قرار مهم في التصميم: بنجدول **الصلوات الجاية القريبة بس**
 *  (خمسة)، مش شهر كامل. السبب إن كل منبّه بيستهلك من حصة
 *  التطبيق، والشركات المصنّعة بتقص الزيادة. وبعد كل أذان،
 *  المستقبِل بيعيد بناء الجدول — فالسلسلة بتفضل ماشية لوحدها.
 *
 *  المواقيت نفسها بتتحسب في الجافاسكربت (نفس محرّك المواقيت
 *  الموجود) وبتتبعت هنا جاهزة. بنخزّنها عشان نقدر نرجّعها بعد
 *  إعادة تشغيل الموبايل من غير ما نحتاج نفتح التطبيق.
 * ============================================================
 */
public class AthanAlarms {

  private static final String PREFS = "iqra_athan";
  private static final String KEY_LIST = "schedule";

  // بنجدول الخمسة الجايين بس — الباقي محفوظ وبيتجدول مع كل أذان
  private static final int ACTIVE_WINDOW = 5;

  private static final int REQUEST_BASE = 61000;

  // ------------------------------------------------------------
  //  الحفظ
  // ------------------------------------------------------------

  /** items: [{ at: long(ms), sound: String, label: String }] */
  public static void save(Context ctx, JSONArray items) {
    SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    p.edit().putString(KEY_LIST, items == null ? "[]" : items.toString()).apply();
  }

  public static JSONArray load(Context ctx) {
    SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    try {
      return new JSONArray(p.getString(KEY_LIST, "[]"));
    } catch (Exception e) {
      return new JSONArray();
    }
  }

  public static void clearSaved(Context ctx) {
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_LIST).apply();
  }

  // ------------------------------------------------------------
  //  الجدولة
  // ------------------------------------------------------------

  /** بيلغي القديم ويجدول الصلوات الجاية من المحفوظ. بيرجّع العدد. */
  public static int rescheduleAll(Context ctx) {
    cancelAll(ctx);

    AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
    if (am == null) return 0;

    JSONArray items = load(ctx);
    long now = System.currentTimeMillis();
    int scheduled = 0;

    for (int i = 0; i < items.length() && scheduled < ACTIVE_WINDOW; i++) {
      JSONObject o = items.optJSONObject(i);
      if (o == null) continue;

      long at = o.optLong("at", 0L);
      if (at <= now) continue; // عدّى خلاص

      String sound = o.optString("sound", "");
      String label = o.optString("label", "الصلاة");

      Intent fire = new Intent(ctx, AthanReceiver.class)
          .putExtra(AthanReceiver.EXTRA_SOUND, sound)
          .putExtra(AthanReceiver.EXTRA_LABEL, label);

      int flags = PendingIntent.FLAG_UPDATE_CURRENT;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        flags |= PendingIntent.FLAG_IMMUTABLE;
      }

      PendingIntent pi =
          PendingIntent.getBroadcast(ctx, REQUEST_BASE + scheduled, fire, flags);

      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          // الفتح ده بيتفتح لما المستخدم يدوس على أيقونة المنبّه
          // في شريط الحالة — بنوديه على التطبيق.
          Intent show = new Intent(ctx, MainActivity.class);
          PendingIntent showPi = PendingIntent.getActivity(ctx, REQUEST_BASE + 900, show, flags);
          am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, showPi), pi);
        } else {
          am.setExact(AlarmManager.RTC_WAKEUP, at, pi);
        }
        scheduled++;
      } catch (SecurityException e) {
        // أندرويد ١٢+ ممكن يرفض المنبّهات المضبوطة لو الإذن
        // مسحوب. بنرجع لمنبّه عادي بدل ما نفشل تمامًا —
        // متأخّر أحسن من مفيش.
        try {
          am.set(AlarmManager.RTC_WAKEUP, at, pi);
          scheduled++;
        } catch (Exception ignored) {
        }
      } catch (Exception ignored) {
      }
    }

    return scheduled;
  }

  public static void cancelAll(Context ctx) {
    AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
    if (am == null) return;

    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }

    for (int i = 0; i < ACTIVE_WINDOW; i++) {
      Intent fire = new Intent(ctx, AthanReceiver.class);
      PendingIntent pi = PendingIntent.getBroadcast(ctx, REQUEST_BASE + i, fire, flags);
      try {
        am.cancel(pi);
        pi.cancel();
      } catch (Exception ignored) {
      }
    }
  }

  /** هل التطبيق مسموح له بمنبّهات مضبوطة؟ (أندرويد ١٢+) */
  public static boolean canScheduleExact(Context ctx) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
    AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
    return am != null && am.canScheduleExactAlarms();
  }
}
