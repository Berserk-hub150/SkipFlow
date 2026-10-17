"""Regenerate the original, silent demonstration clip (requires ffmpeg)."""
from pathlib import Path
import subprocess

target = Path(__file__).resolve().parent.parent / 'demo' / 'sample.webm'
filters = (
    "drawgrid=w=80:h=80:t=1:c=0x9ef6d0@0.06,"
    "drawbox=x=100:y=110:w=140:h=6:color=0x9ef6d0:t=fill,"
    "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:"
    "text='S K I P F L O W':fontsize=22:fontcolor=0x9ef6d0:x=100:y=150,"
    "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:"
    "text='Controlla ogni secondo.':fontsize=40:fontcolor=0xf1f7f4:x=100:y=205,"
    "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf:"
    "text='%{pts\\:hms}':fontsize=32:fontcolor=0x9ef6d0:x=100:y=310,"
    "drawbox=x=100:y=390:w=760:h=3:color=0x314740:t=fill,"
    "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:"
    "text='-10  /  +10     -30  /  +30     A - B':fontsize=20:fontcolor=0x92aaa2:x=100:y=420"
)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',
                'color=c=0x11211f:s=960x540:r=12:d=60','-vf',filters,
                '-c:v','libvpx-vp9','-b:v','0','-crf','38','-an',str(target)], check=True)
print(target)
