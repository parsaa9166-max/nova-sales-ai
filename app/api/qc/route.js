import { NextResponse } from 'next/server';
import { getFal } from '../../../lib/fal';

export const runtime='nodejs';
export const maxDuration=60;

export async function POST(req){
  try{
    const {imageUrl,analysis,style='clean'}=await req.json();

    if(!imageUrl)
      return NextResponse.json(
        {error:'تصویر برای کنترل کیفیت لازم است.'},
        {status:400}
      );

    const fal=getFal();

    const {request_id}=await fal.queue.submit(
      'openrouter/router/vision',
      {
        input:{
          image_urls:[imageUrl],
          model:process.env.NOVA_VISION_MODEL||'google/gemini-2.5-flash',
          temperature:0,
          max_tokens:700,
          system_prompt:
            'تو کنترل کیفیت عکس تبلیغاتی محصول هستی. فقط JSON معتبر بده. اگر چیزی را نمی‌توانی با اطمینان ببینی، آن را حدس نزن.',
          prompt:`این تصویر خروجی تبلیغاتی محصول است. آن را با تحلیل محصول مقایسه کن: ${JSON.stringify(analysis||{})}. سبک مورد انتظار: ${style}. بررسی کن: آیا محصول اصلی هنوز قابل تشخیص و سالم است؟ آیا تغییر شکل، رنگ یا جزئیات مهم رخ داده؟ آیا محصول اضافه یا حذف شده؟ آیا متن یا واترمارک ساختگی روی تصویر هست؟ آیا تصویر برای تبلیغات فروش مناسب است؟ دقیقاً JSON بده با کلیدهای pass (boolean), score (0-100),
