package app.iqra.quran;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ============================================================
 *  جسر الأذان بين الجافاسكربت والنظام
 * ------------------------------------------------------------
 *  الجافاسكربت بيحسب المواقيت (نفس محرّك المواقيت الموجود) ويبعت
 *  قائمة جاهزة. الجافا بيجدولها كمنبّهات ويشغّل الصوت بنفسه.
 *
 *  تقسيم الشغل ده مقصود: حساب المواقيت فيه منطق (مذاهب، طرق
 *  حساب، مواقع) وموجود ومختبَر في الجافاسكربت — مفيش داعي نعيد
 *  كتابته بالجافا ونفتح باب اختلاف في النتايج بين الاتنين.
 * ============================================================
 */
@CapacitorPlugin(name = "Athan")
public class AthanPlugin extends Plugin {

  /**
   * schedule({ prayers: [{ at: number(ms), sound: string, label: string }] })
   */
  @PluginMethod
  public void schedule(PluginCall call) {
    JSArray arr = call.getArray("prayers");
    JSONArray out = new JSONArray();

    if (arr != null) {
      for (int i = 0; i < arr.length(); i++) {
        try {
          JSONObject src = arr.getJSONObject(i);
          long at = src.optLong("at", 0L);
          if (at <= 0) continue;

          JSONObject o = new JSONObject();
          o.put("at", at);
          o.put("sound", src.optString("sound", ""));
          o.put("label", src.optString("label", "الصلاة"));
          o.put("volume", src.optDouble("volume", 0.9));
          out.put(o);
        } catch (Exception ignored) {
        }
      }
    }

    AthanAlarms.save(getContext(), out);
    int n = AthanAlarms.rescheduleAll(getContext());

    JSObject res = new JSObject();
    res.put("saved", out.length());
    res.put("scheduled", n);
    res.put("exactAllowed", AthanAlarms.canScheduleExact(getContext()));
    call.resolve(res);
  }

  @PluginMethod
  public void cancelAll(PluginCall call) {
    AthanAlarms.cancelAll(getContext());
    AthanAlarms.clearSaved(getContext());
    call.resolve();
  }

  /** إيقاف الأذان اللي بيتشغّل دلوقتي. */
  @PluginMethod
  public void stop(PluginCall call) {
    AthanService.stop(getContext());
    call.resolve();
  }

  /** تشغيل الأذان فورًا — لتجربة الصوت. */
  @PluginMethod
  public void playNow(PluginCall call) {
    String sound = call.getString("sound", "");
    String label = call.getString("label", "تجربة");
    Double vol = call.getDouble("volume", 0.9);
    AthanService.start(getContext(), sound, label, vol.floatValue());
    call.resolve();
  }

  /** حالة الجدولة الفعلية — عشان الواجهة تعرض حقيقة مش تخمين. */
  @PluginMethod
  public void status(PluginCall call) {
    JSONArray saved = AthanAlarms.load(getContext());
    long now = System.currentTimeMillis();

    int upcoming = 0;
    long next = 0L;
    String nextLabel = "";
    for (int i = 0; i < saved.length(); i++) {
      JSONObject o = saved.optJSONObject(i);
      if (o == null) continue;
      long at = o.optLong("at", 0L);
      if (at <= now) continue;
      upcoming++;
      if (next == 0L || at < next) {
        next = at;
        nextLabel = o.optString("label", "");
      }
    }

    JSObject res = new JSObject();
    res.put("saved", saved.length());
    res.put("upcoming", upcoming);
    res.put("next", next);
    res.put("nextLabel", nextLabel);
    res.put("exactAllowed", AthanAlarms.canScheduleExact(getContext()));
    call.resolve(res);
  }
}
