import { NextResponse } from 'next/server';
import { getFal } from '../../../lib/fal';

export const runtime='nodejs';
export const maxDuration=60;

const styleMap={
  clean:'استودیویی تمیز و مینیمال',
  luxury:'لوکس و پریمیوم با نور سینمایی',
  lifestyle:'لایف‌استایل واقعی و کاربردی',
  market:'فروشگاهی پرقدرت و واضح'
};

export async function POST(req){
  try{
    const body=await req.json();

    const {
      sourceImageUrl,
      analysis,
      price='',
      description='',
      category='',
      tone='صمیمی و فروش‌محور',
      style='clean'
    }=body;

    if(!sourceImageUrl)
      return NextResponse.json(
        {error:'تصویر آماده نیست.'},
        {status:400}
      );

    if(!process.env.FAL_KEY)
      return NextResponse.json(
        {error:'FAL_KEY_MISSING'},
        {status:500}
      );

    const fal=getFal();
    const visualStyle=styleMap[style]||styleMap.clean;

    const textJob=fal.queue.submit(
      'openrouter/router',
      {
        input:{
          model:process.env.NOVA_TEXT_MODEL||'google/gemini-2.5-flash',
          temperature:0.65,
          max_tokens:1800,

          system_prompt:
            'تو کپی‌رایتر حرفه‌ای فروش آنلاین فارسی هستی. اغراق در ویژگی‌های اثبات‌نشده ممنوع. فقط JSON معتبر بده.',

          prompt:`برای این محصول یک پکیج کامل فروش بساز. تحلیل تصویر: ${JSON.stringify(analysis||{})}. توضیح مشتری: ${description||'ندارد'}. قیمت: ${price||'اعلام نشده'}. دسته: ${category||analysis?.category||'نامشخص'}. لحن: ${tone}. سبک تصویر: ${visualStyle}. JSON دقیقاً شامل title, short_description, full_description, instagram_caption, story_text, hashtags (آرایه 8 تا 12 تایی), cta, visual_prompt باشد. فارسی روان، کوتاه و فروش‌محور.`
        }
      }
    );

    const imagePrompt=
      `ویرایش حرفه‌ای عکس محصول برای تبلیغات فروش آنلاین. ${visualStyle}. محصول اصلی باید دقیقاً حفظ شود: شکل، تعداد، رنگ، لوگو، نوشته، جنس و جزئیات واقعی تغییر نکند و محصول جدیدی اضافه نشود. پس‌زمینه تمیز و حرفه‌ای، نورپردازی واقعی، سایه طبیعی، کادربندی عمودی 4:5، محصول واضح و در مرکز توجه. هیچ متن، قیمت، واترمارک یا لوگوی ساختگی روی تصویر قرار نده. ${analysis?.visual_prompt||''}`;

    const imageJob=fal.queue.submit(
      'fal-ai/flux-2/edit',
      {
        input:{
          prompt:imagePrompt,
          image_urls:[sourceImageUrl],
          image_size:{
            width:1024,
            height:1280
          },
          num_images:1,
          output_format:'jpeg',
          enable_safety_checker:true
        }
      }
    );

    const [text,image]=await Promise.all([
      textJob,
      imageJob
    ]);

    return NextResponse.json({
      textRequestId:text.request_id,
      imageRequestId:image.request_id,
      style
    });

  }catch(e){
    return NextResponse.json(
      {error:e.message||'تولید پکیج شروع نشد.'},
      {status:500}
    );
  }
}
