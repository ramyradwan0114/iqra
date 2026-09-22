package app.iqra.quran;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

/**
 * ============================================================
 *  تشغيل الأذان
 * ------------------------------------------------------------
 *  ليه خدمة أصلية بدل صوت إشعار:
 *
 *  صوت الإشعار في أندرويد مربوط بقناة الإشعار، وسلوكه بيتحكّم فيه
 *  النظام — ممكن يتكتم في وضع «عدم الإزعاج»، أو يتقص بعد ثواني،
 *  أو الشركات المصنّعة تكتمه للتطبيقات الخاملة. وده اللي كان
 *  بيحصل: الإشعار بيوصل في وقته والأذان مش بيتسمع.
 *
 *  الخدمة دي بتشغّل الملف بنفسها بـ MediaPlayer على
 *  **قناة المنبّه (USAGE_ALARM)**. يعني:
 *    • بتعدّي وضع «عدم الإزعاج» زي أي منبّه
 *    • بتشتغل على صوت المنبّه مش صوت الإشعارات
 *    • بتشغّل الأذان **كامل** مش مقطوع
 *
 *  وخدمة أمامية عشان أندرويد مايوقفهاش وسط التشغيل.
 *
 *  ⚠️ من أندرويد ١٤، أي خدمة أمامية لازم يبقى ليها نوع معلن.
 *  النوع هنا mediaPlayback — وده بالظبط اللي بنعمله.
 * ============================================================
 */
public class AthanService extends Service {

  public static final String ACTION_PLAY = "app.iqra.quran.PLAY_ATHAN";
  public static final String ACTION_STOP = "app.iqra.quran.STOP_ATHAN";

  public static final String EXTRA_SOUND = "sound";   // اسم الملف في res/raw
  public static final String EXTRA_LABEL = "label";   // «الفجر» مثلًا

  private static final String CHANNEL_ID = "athan_playback";
  private static final int NOTIF_ID = 7777;

  private MediaPlayer player;
  private PowerManager.WakeLock wakeLock;

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    String action = intent != null ? intent.getAction() : null;

    if (ACTION_STOP.equals(action)) {
      stopEverything();
      return START_NOT_STICKY;
    }

    String sound = intent != null ? intent.getStringExtra(EXTRA_SOUND) : null;
    String label = intent != null ? intent.getStringExtra(EXTRA_LABEL) : null;
    if (label == null) label = "الصلاة";

    // لازم نبقى أمامية **فورًا**، وإلا أندرويد بيرمي استثناء
    // ويقفل الخدمة خلال ٥ ثواني.
    startForeground(NOTIF_ID, buildNotification(label));

    // الشاشة مقفولة والمعالج ممكن ينام وسط التشغيل. القفل ده
    // بيضمن إن الأذان يكمّل. بنسيبه ١٠ دقايق كحد أقصى وبنفكّه
    // بمجرد ما الصوت يخلص.
    acquireWake();

    play(sound);
    return START_NOT_STICKY;
  }

  // ------------------------------------------------------------
  //  التشغيل
  // ------------------------------------------------------------
  private void play(String soundName) {
    stopPlayer();

    int resId = 0;
    if (soundName != null && soundName.length() > 0) {
      resId = getResources().getIdentifier(soundName, "raw", getPackageName());
    }
    if (resId == 0) {
      // مفيش ملف بالاسم ده — نوقف بهدوء بدل ما نفضل خدمة صامتة
      // شغّالة في الخلفية للأبد.
      stopEverything();
      return;
    }

    try {
      player = new MediaPlayer();
      player.setAudioAttributes(
          new AudioAttributes.Builder()
              // USAGE_ALARM هو المفتاح: بيخلّي الصوت يعدّي وضع
              // «عدم الإزعاج» وبيشتغل على مستوى صوت المنبّه.
              .setUsage(AudioAttributes.USAGE_ALARM)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build());

      Uri uri = Uri.parse("android.resource://" + getPackageName() + "/" + resId);
      player.setDataSource(this, uri);
      player.setLooping(false);
      player.setOnCompletionListener(mp -> stopEverything());
      player.setOnErrorListener((mp, what, extra) -> {
        stopEverything();
        return true;
      });
      player.prepare();
      player.start();
    } catch (Exception e) {
      stopEverything();
    }
  }

  private void stopPlayer() {
    if (player != null) {
      try {
        if (player.isPlaying()) player.stop();
      } catch (Exception ignored) {
      }
      try {
        player.release();
      } catch (Exception ignored) {
      }
      player = null;
    }
  }

  private void stopEverything() {
    stopPlayer();
    releaseWake();
    try {
      stopForeground(true);
    } catch (Exception ignored) {
    }
    stopSelf();
  }

  @Override
  public void onDestroy() {
    stopPlayer();
    releaseWake();
    super.onDestroy();
  }

  // ------------------------------------------------------------
  //  قفل الاستيقاظ
  // ------------------------------------------------------------
  private void acquireWake() {
    try {
      PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
      if (pm == null) return;
      wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "iqra:athan");
      wakeLock.setReferenceCounted(false);
      wakeLock.acquire(10 * 60 * 1000L);
    } catch (Exception ignored) {
    }
  }

  private void releaseWake() {
    try {
      if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
    } catch (Exception ignored) {
    }
    wakeLock = null;
  }

  // ------------------------------------------------------------
  //  الإشعار المصاحب
  // ------------------------------------------------------------
  //  الإشعار ده **صامت عن قصد** (أهمية منخفضة ومن غير صوت).
  //  الصوت بيطلع من MediaPlayer مش من الإشعار — لو خلّيناه
  //  بصوت كمان، هيتشغّل صوتين مع بعض.
  private Notification buildNotification(String label) {
    NotificationManager nm =
        (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
      NotificationChannel ch =
          new NotificationChannel(CHANNEL_ID, "تشغيل الأذان", NotificationManager.IMPORTANCE_LOW);
      ch.setDescription("يظهر أثناء رفع الأذان");
      ch.setSound(null, null);
      ch.enableVibration(false);
      ch.setShowBadge(false);
      nm.createNotificationChannel(ch);
    }

    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }

    Intent stopIntent = new Intent(this, AthanService.class).setAction(ACTION_STOP);
    PendingIntent stopPending = PendingIntent.getService(this, 1, stopIntent, flags);

    Intent openIntent = new Intent(this, MainActivity.class);
    openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent openPending = PendingIntent.getActivity(this, 2, openIntent, flags);

    Notification.Builder b;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      b = new Notification.Builder(this, CHANNEL_ID);
    } else {
      b = new Notification.Builder(this);
    }

    b.setContentTitle("أذان " + label)
        .setContentText("حان الآن موعد الصلاة")
        .setSmallIcon(getResources().getIdentifier("ic_stat_iqra", "drawable", getPackageName()))
        .setContentIntent(openPending)
        .setOngoing(true)
        .setAutoCancel(false);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      b.setCategory(Notification.CATEGORY_ALARM);
      b.setVisibility(Notification.VISIBILITY_PUBLIC);
    }

    // زر إيقاف — ضروري: الأذان بياخد دقايق، ولازم المستخدم يقدر
    // يوقفه من غير ما يفتح التطبيق.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      b.addAction(new Notification.Action.Builder(null, "إيقاف", stopPending).build());
    } else {
      b.addAction(0, "إيقاف", stopPending);
    }

    return b.build();
  }

  /** طريقة مختصرة لتشغيل الخدمة من أي مكان. */
  public static void start(Context ctx, String sound, String label) {
    Intent i = new Intent(ctx, AthanService.class)
        .setAction(ACTION_PLAY)
        .putExtra(EXTRA_SOUND, sound)
        .putExtra(EXTRA_LABEL, label);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      ctx.startForegroundService(i);
    } else {
      ctx.startService(i);
    }
  }

  /** إيقاف الأذان الشغّال دلوقتي. */
  public static void stop(Context ctx) {
    Intent i = new Intent(ctx, AthanService.class).setAction(ACTION_STOP);
    try {
      ctx.startService(i);
    } catch (Exception ignored) {
    }
  }
}
