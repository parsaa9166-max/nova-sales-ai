'use client';

import { useEffect, useRef, useState } from 'react';

const styles = [
  ['clean', 'تمیز و استودیویی'],
  ['luxury', 'لوکس و پریمیوم'],
  ['lifestyle', 'لایف‌استایل'],
  ['market', 'فروشگاهی']
];

const empty = {
  analysis: null,
  copy: null,
  imageUrl: '',
  sourceImageUrl: '',
  style: 'clean'
};

export default function Home() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tone, setTone] = useState('صمیمی و فروش‌محور');
  const [style, setStyle] = useState('clean');

  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(empty);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [qc, setQc] = useState(null);

  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem('nova_history') || '[]'));
    } catch {}

    return () => {
      clearInterval(timer.current);
      if (preview) URL.revokeObjectURL(preview);
    };
  }, []);

  const pick = e => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith('image/')) {
      return setError('فقط فایل تصویری انتخاب کن.');
    }

    if (f.size > 12 * 1024 * 1024) {
      return setError('حجم عکس باید کمتر از ۱۲ مگابایت باشد.');
    }

    setError('');

    if (preview) URL.revokeObjectURL(preview);

    setImage(f);
    setPreview(URL.createObjectURL(f));
    setResult(empty);
  };

  const startProgress = () => {
    clearInterval(timer.current);

    let p = 3;
    setProgress(p);

    timer.current = setInterval(() => {
      p = Math.min(p + Math.random() * 6, 92);
      setProgress(Math.round(p));
    }, 900);
  };

  async function poll(path, id, limit = 100) {
    for (let i = 0; i < limit; i++) {
      await new Promise(r => setTimeout(r, 1400));

      const r = await fetch(
        path + encodeURIComponent(id),
        { cache: 'no-store' }
      );

      const j = await r.json();

      if (j.status === 'COMPLETED') return j;

      if (j.status === 'FAILED') {
        throw new Error(j.error || 'پردازش ناموفق بود');
      }
    }

    throw new Error(
      'پردازش بیشتر از زمان معمول طول کشید. دوباره امتحان کن.'
    );
  }

  async function generate() {
    if (!image) {
      return setError('اول عکس محصول را بفرست.');
    }

    setBusy(true);
    setError('');
    setResult(empty);
    setQc(null);
    startProgress();

    try {
      setStep('در حال ارسال عکس برای Vision AI...');

      const fd = new FormData();
      fd.append('image', image);
      fd.append('description', description);
      fd.append('category', category);

      const a = await fetch('/api/analyze', {
        method: 'POST',
        body: fd
      });

      const aj = await a.json();

      if (!a.ok) {
        throw new Error(
          aj.error || 'شروع تحلیل محصول ناموفق بود'
        );
      }

      setProgress(10);
      setStep('Vision AI در حال شناخت محصول است...');

      const av = await poll(
        '/api/vision-job?id=',
        aj.requestId
      );

      setProgress(30);
      setStep('در حال ساخت متن و عکس تبلیغاتی...');

      const g = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceImageUrl: aj.sourceImageUrl,
          analysis: av.analysis,
          price,
          description,
          category,
          tone,
          style
        })
      });

      const gj = await g.json();

      if (!g.ok) {
        throw new Error(
          gj.error || 'تولید پکیج شروع نشد'
        );
      }

      setResult({
        analysis: av.analysis,
        copy: null,
        sourceImageUrl: aj.sourceImageUrl,
        style
      });

      const [imgJob, textJob] = await Promise.all([
        poll('/api/job?id=', gj.imageRequestId),
        poll('/api/text-job?id=', gj.textRequestId)
      ]);

      setResult(x => ({
        ...x,
        imageUrl: imgJob.imageUrl,
        copy: textJob.copy
      }));

      setProgress(90);
      setStep('کنترل کیفیت AI...');

      const qcStart = await fetch('/api/qc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: imgJob.imageUrl,
          analysis: av.analysis,
          style
        })
      });

      if (qcStart.ok) {
        const qs = await qcStart.json();

        const qcr = await poll(
          '/api/qc-status?id=',
          qs.requestId,
          50
        );

        setQc(qcr.qc || null);
      }

      setProgress(100);
      setStep('پکیج فروش آماده شد ✨');

      const item = {
        id: Date.now(),
        title: textJob.copy?.title || 'محصول جدید',
        imageUrl: imgJob.imageUrl,
        copy: textJob.copy,
        style
      };

      const next = [item, ...history].slice(0, 5);

      setHistory(next);

      localStorage.setItem(
        'nova_history',
        JSON.stringify(next)
      );

    } catch (e) {
      setError(e.message || 'خطایی رخ داد.');
      setStep('');
    } finally {
      clearInterval(timer.current);
      setBusy(false);
    }
  }

  const share = async () => {
    if (!result.imageUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: result.copy?.title || 'محصول من',
          text: result.copy?.instagram_caption || ''
        });
      } else {
        window.open(result.imageUrl, '_blank');
      }
    } catch {}
  };

  const copyText = t =>
    navigator.clipboard?.writeText(t || '');

  const regenerate = async nextStyle => {
    if (!result.sourceImageUrl || busy) return;

    setBusy(true);
    setError('');
    setQc(null);
    setStyle(nextStyle);
    setStep('در حال ساخت نسخه جدید عکس...');
    setProgress(15);

    try {
      const r = await fetch('/api/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceImageUrl: result.sourceImageUrl,
          analysis: result.analysis,
          style: nextStyle,
          visualPrompt: result.copy?.visual_prompt || ''
        })
      });

      const j = await r.json();

      if (!r.ok) {
        throw new Error(
          j.error || 'تولید مجدد شروع نشد'
        );
      }

      const q = await poll(
        '/api/job?id=',
        j.requestId
      );

      setResult(x => ({
        ...x,
        imageUrl: q.imageUrl,
        style: nextStyle
      }));

      setProgress(90);
      setStep('کنترل کیفیت نسخه جدید...');

      const qs = await fetch('/api/qc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: q.imageUrl,
          analysis: result.analysis,
          style: nextStyle
        })
      });

      if (qs.ok) {
        const qsj = await qs.json();

        const qcr = await poll(
          '/api/qc-status?id=',
          qsj.requestId,
          50
        );

        setQc(qcr.qc || null);
      }

      setProgress(100);
      setStep('نسخه جدید آماده شد ✨');

    } catch (e) {
      setError(
        e.message || 'خطا در تولید مجدد'
      );
      setStep('');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setImage(null);

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview('');
    setResult(empty);
    setQc(null);
    setError('');
    setProgress(0);
    setStep('');

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const loadHistory = item =>
    setResult({
      analysis: null,
      copy: item.copy,
      imageUrl: item.imageUrl,
      sourceImageUrl: '',
      style: item.style || 'clean'
    });

  return (
    <main>
      <header>
        <div className="logo">
          NOVA<span>AI</span>
        </div>

        <div className="badge">
          فروش خودکار
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">
          عکس محصول → پکیج فروش
        </div>

        <h1>
          یک عکس بده،
          <br />
          <b>فروشگاهت آماده‌ست.</b>
        </h1>

        <p>
          هوش مصنوعی محصول را می‌فهمد،
          عکس تبلیغاتی می‌سازد و متن کامل فروش را آماده می‌کند.
        </p>
      </section>

      <section className="card">
        <label className="photo" htmlFor="photo">
          <input
            id="photo"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            onChange={pick}
          />

          {preview ? (
            <img
              src={preview}
              alt="پیش‌نمایش محصول"
            />
          ) : (
            <>
              <div className="cam">＋</div>
              <strong>
                عکس محصول را اضافه کن
              </strong>
              <small>
                دوربین یا گالری
              </small>
            </>
          )}
        </label>

        <div className="fields">
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="قیمت، مثلاً ۱,۲۹۰,۰۰۰ تومان"
            inputMode="decimal"
          />

          <input
            value={category}
            onChange={e =>
              setCategory(e.target.value)
            }
            placeholder="دسته‌بندی، اختیاری"
          />

          <textarea
            value={description}
            onChange={e =>
              setDescription(e.target.value)
            }
            placeholder="چند کلمه درباره محصول، اختیاری"
            rows="3"
          />
        </div>

        <div className="row">
          <select
            value={tone}
            onChange={e =>
              setTone(e.target.value)
            }
          >
            <option>
              صمیمی و فروش‌محور
            </option>

            <option>
              لوکس و حرفه‌ای
            </option>

            <option>
              کوتاه و مستقیم
            </option>
          </select>
        </div>

        <div className="styles">
          <div className="label">
            سبک عکس تبلیغاتی
          </div>

          <div className="stylegrid">
            {styles.map(([id, name]) => (
              <button
                type="button"
                key={id}
                className={
                  style === id ? 'active' : ''
                }
                onClick={() => setStyle(id)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button
          className="generate"
          disabled={busy}
          onClick={generate}
        >
          {busy ? (
            <>
              <span className="spinner" />
              {step || 'در حال آماده‌سازی...'}
            </>
          ) : (
            'ساخت پکیج فروش ✨'
          )}
        </button>

        {busy && (
          <div className="progress">
            <div>
              <span>{step}</span>
              <b>{Math.round(progress)}%</b>
            </div>

            <i>
              <em
                style={{
                  width: `${progress}%`
                }}
              />
            </i>
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="history">
          <div className="label">
            آخرین خروجی‌ها
          </div>

          <div className="historygrid">
            {history.map(x => (
              <button
                type="button"
                key={x.id}
                onClick={() => loadHistory(x)}
              >
                {x.imageUrl ? (
                  <img
                    src={x.imageUrl}
                    alt=""
                  />
                ) : (
                  <div className="historyplaceholder">
                    NOVA
                  </div>
                )}

                <span>
                  {x.title}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {result.copy && (
        <section className="results">
          <div className="resulthead">
            <div>
              <span className="eyebrow">
                پکیج نهایی
              </span>

              <h2>
                {result.copy.title}
              </h2>
            </div>

            <button
              type="button"
              className="ghost"
              onClick={reset}
            >
              محصول جدید
            </button>
          </div>

          {result.imageUrl ? (
            <div className="finalimage">
              <img
                src={result.imageUrl}
                alt={result.copy.title}
              />

              <div className="imageactions">
                <a
                  href={
                    '/api/download?url=' +
                    encodeURIComponent(
                      result.imageUrl
                    )
                  }
                >
                  دانلود عکس
                </a>

                <button
                  type="button"
                  onClick={share}
                >
                  اشتراک‌گذاری
                </button>
              </div>
            </div>
          ) : (
            <div className="waiting">
              ⏳ عکس تبلیغاتی در حال آماده‌سازی است...
            </div>
          )}

          <div className="copygrid">
            <Box
              title="توضیح کوتاه"
              text={result.copy.short_description}
              onCopy={copyText}
            />

            <Box
              title="توضیحات محصول"
              text={result.copy.full_description}
              onCopy={copyText}
            />

            <Box
              title="کپشن اینستاگرام"
              text={result.copy.instagram_caption}
              onCopy={copyText}
            />

            <Box
              title="استوری"
              text={result.copy.story_text}
              onCopy={copyText}
            />

            <Box
              title="دعوت به خرید"
              text={result.copy.cta}
              onCopy={copyText}
            />

            <Box
              title="هشتگ‌ها"
              text={(result.copy.hashtags || []).join(' ')}
              onCopy={copyText}
            />
          </div>

          {result.imageUrl &&
            result.sourceImageUrl && (
              <div className="regenerate">
                <div className="label">
                  نسخه دیگر عکس
                </div>

                <div className="stylegrid">
                  {styles.map(([id, name]) => (
                    <button
                      type="button"
                      key={id}
                      className={
                        result.style === id
                          ? 'active'
                          : ''
                      }
                      disabled={busy}
                      onClick={() =>
                        regenerate(id)
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {qc && (
            <div
              className={
                qc.pass
                  ? 'qc pass'
                  : 'qc fail'
              }
            >
              <b>
                کنترل کیفیت AI: {qc.score ?? '—'}/100
              </b>

              <span>
                {qc.pass
                  ? 'مناسب برای انتشار'
                  : 'نیاز به بررسی دوباره'}
              </span>

              {Array.isArray(qc.issues) &&
                qc.issues.length > 0 && (
                  <small>
                    {qc.issues.join(' • ')}
                  </small>
                )}
            </div>
          )}

          {result.analysis && (
            <details className="analysis">
              <summary>
                تحلیل هوش مصنوعی محصول
              </summary>

              <div>
                <b>دسته:</b>{' '}
                {result.analysis.category ||
                  'نامشخص'}{' '}
                ·{' '}
                <b>رنگ:</b>{' '}
                {result.analysis.color ||
                  'نامشخص'}
              </div>

              <p>
                {(
                  result.analysis
                    .selling_points || []
                ).join(' • ')}
              </p>
            </details>
          )}
        </section>
      )}

      <footer>
        NOVA فروش AI • تولید محتوای فروش با هوش مصنوعی
      </footer>
    </main>
  );
}

function Box({ title, text, onCopy }) {
  return (
    <article className="box">
      <div>
        <h3>{title}</h3>

        <button
          type="button"
          onClick={() => onCopy(text)}
        >
          کپی
        </button>
      </div>

      <p>
        {text || 'در حال آماده‌سازی...'}
      </p>
    </article>
  );
}
