import { NextResponse } from 'next/server';
import { getFal } from '../../../lib/fal';

export const runtime='nodejs';

export async function GET(req){
  try{
    const id=new URL(req.url).searchParams.get('id');

    if(!id)
      return NextResponse.json(
        {error:'شناسه درخواست لازم است.'},
        {status:400}
      );

    const fal=getFal();

    const status=await fal.queue.status(
      'fal-ai/flux-2/edit',
      {requestId:id,logs:false}
    );

    if(status.status==='COMPLETED'){
      const result=await fal.queue.result(
        'fal-ai/flux-2/edit',
        {requestId:id}
      );

      const imageUrl=result?.data?.images?.[0]?.url;

      if(!imageUrl)
        return NextResponse.json({
          status:'FAILED',
          error:'تصویر خروجی از سرویس دریافت نشد.'
        });

      return NextResponse.json({
        status:'COMPLETED',
        imageUrl,
        seed:result?.data?.seed
      });
    }

    if(status.status==='FAILED')
      return NextResponse.json({
        status:'FAILED',
        error:'تولید تصویر ناموفق بود.'
      });

    return NextResponse.json({
      status:status.status||'IN_PROGRESS'
    });

  }catch(e){
    return NextResponse.json({
      status:'FAILED',
      error:e.message||'خطا در بررسی وضعیت'
    },{status:500});
  }
}
