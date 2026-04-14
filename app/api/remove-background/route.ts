import { NextResponse } from 'next/server';
import Replicate from "replicate";

const MODEL = "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1" as const;
// const MODEL = "/" as const;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const isAuthenticated = formData.get('isAuthenticated') === 'true';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
      useFileOutput: false,
    });

    const output = await replicate.run(
      MODEL,
      {
        input: {
          image: file
        }
      }
    );
    console.log("Replicate output:", output);

    return NextResponse.json({ url: output });

  } catch (error: any) {
    console.error('Background removal error:', error);
    return NextResponse.json(
      { error: 'Failed to remove background: ' + error.message },
      { status: 500 }
    );
  }
}
