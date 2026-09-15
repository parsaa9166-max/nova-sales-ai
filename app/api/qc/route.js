import { NextResponse } from 'next/server';
import { getFal, cleanJson } from '../../../lib/fal';

export const runtime='nodejs';

export async function GET(req){
  try{
    const id=new URL(req.url).searchParams.get('id');

    if(!id)
      return NextResponse.json(
        {error:'شناسه درخواست کنترل کیفیت لازم است.'},
        {status:400}
      );

    const fal=getFal();

    const status=await fal.queue.status(
      'openrouter/router/vision',
      {requestId:id,logs:false}
    );

    if(status.status==='COMPLETED'){
      const result=await fal.queue.result(
        'openrouter/router/vision',
        {requestId:id}
      );

      const raw=
        result?.data?.output ??
        result?.data?.text ??
        result?.data;

      const qc=
        typeof raw==='string'
          ? cleanJson(raw)
          : raw;

      return NextResponse.json({
        status:'COMPLETED',
        qc
      });
    }

    if(status.status==='FAILED')
      return NextResponse.json({
        status:'FAILED',
        error:'کنترل کیفیت تصویر ناموفق بود.'
      });

    return NextResponse.json({
      status:status.status||'IN_PROGRESS'
    });

  }catch(e){
    return NextResponse.json({
      status:'FAILED',
      error:e.message||'خطا در بررسی کنترل کیفیت'
    },{status:500});
  }
}
