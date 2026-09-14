import { NextResponse } from 'next/server';
import { getFal, uploadImage } from '../../../lib/fal';

export const runtime='nodejs';
export const maxDuration=60;

export async function POST(req){
  try{
    const fd=await req.formData();
    const image=fd.get('image');
    const description=(fd.get('description')||'').toString().slice(0,3000);
    const category=(fd.get('category')||'').toString().slice(0,200);

    if(!image||typeof image.arrayBuffer!=='function')
      return NextResponse.json({error:'تصویر محصول لازم است.'},{status:400});

    if(!image.type?.startsWith('image/'))
      return NextResponse.json({error:'فرمت تصویر معتبر نیست.'},{status:400});

    if(image.size>12*1024*1024)
      return NextResponse.json({error:'حجم عکس باید کمتر از ۱۲ مگابایت باشد.'},{status:400});

    const url=await uploadImage(image);
    const fal=getFal();

    const {request_id}=await fal.queue.submit('openrouter/router/vision',{
      input:{
        image_urls:[url],
        model:process.env.NOVA_VISION_MODEL||'google/gemini-2.5-flash',
        temperature:0.2,
        max_tokens:1400,
        system_prompt:'تو تحلیلگر حرفه‌ای محصول برای فروش آنلاین هستی. فقط JSON معتبر بده. چیزی را که در تصویر نمی‌بینی قطعی ادعا نکن. برند و نوشته را فقط اگر خوانا بود گزارش کن.',
        prompt:`این محصول را برای فروش آنلاین تحلیل کن. توضیح کاربر: ${description||'ندارد'} دسته‌بندی: ${category||'نامشخص'}. خروجی دقیقاً JSON با این کلیدها بده: product_name, category, color, material, visible_features, brand_or_text, target_customer, selling_points, visual_risks, recommended_style, visual_prompt. visual_prompt باید برای ادیت عکس محصول باشد و حفظ هویت، شکل، رنگ و جزئیات اصلی محصول را الزام کند.`
      }
    });

    return NextResponse.json({
      sourceImageUrl:url,
      requestId:request_id
    });
  }catch(e){
    return NextResponse.json({
      error:e.message||'شروع تحلیل محصول ناموفق بود.'
    },{status:500})
  }
}
