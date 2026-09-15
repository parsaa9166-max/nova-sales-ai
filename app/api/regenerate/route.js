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
    const {
      sourceImageUrl,
      analysis,
      style='clean',
      visualPrompt=''
    }=await req.json();

    if(!sourceImageUrl)
      return NextResponse.json(
        {error:'تصویر اصلی موجود نیست.'},
        {status:400}
      );

    const fal=getFal();

    const prompt=
      `ویرایش حرفه‌ای عکس محصول برای تبلیغات فروش آنلاین. سبک: ${styleMap[style]||styleMap.clean}. محصول اصلی باید دقیقاً حفظ شود: شکل، تعداد، رنگ، لوگو، نوشته، جنس و جزئیات واقعی تغییر نکند و محصول جدیدی اضافه نشود. پس‌زمینه حرفه‌ای، نور واقعی، سایه طبیعی، کادربندی عمودی 4:5، محصول واضح و در مرکز توجه. هیچ متن، قیمت، واترمارک یا لوگوی ساختگی اضافه نکن. ${analysis?.visual_prompt||''} ${visualPrompt||''}`;

    const {request_id}=await fal.queue.submit(
      'fal-ai/flux-2/edit',
      {
        input:{
          prompt,
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

    return NextResponse.json({
      requestId:request_id,
      style
    });

  }catch(e){
    return NextResponse.json({
      error:e.message||'تولید مجدد شروع نشد.'
    },{status:500});
  }
}
