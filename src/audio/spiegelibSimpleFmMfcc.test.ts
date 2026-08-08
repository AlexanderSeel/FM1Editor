import { describe, expect, it } from 'vitest'
import reference from './data/spiegelib-mfcc-librosa-0.7.2-reference.json'
import { extractSpiegelibSimpleFmRawMfcc } from './spiegelibSimpleFmMfcc'
function fixture(): Float32Array {
  const sr=44_100
  const out=new Float32Array(sr)
  for(let i=0;i<out.length;i++){
    const t=i/sr
    const e=0.55+0.35*(i/(sr-1))
    out[i]=e*(0.37*Math.sin(2*Math.PI*220*t)+0.23*Math.sin(2*Math.PI*880*t+0.17)+0.11*Math.cos(2*Math.PI*1760*t+0.31))
  }
  out[0]=(out[0]??0)+0.19
  out[1]=(out[1]??0)-0.07
  out[out.length-2]=(out[out.length-2]??0)+0.09
  out[out.length-1]=(out[out.length-1]??0)-0.13
  return out
}
describe('SpiegeLib MFCC Librosa 0.7.2 compatibility',()=>{
  it('matches all 572 coefficients',()=>{
    const actual=extractSpiegelibSimpleFmRawMfcc(fixture())
    expect(actual).toHaveLength(reference.values.length)
    let max=0,sq=0
    for(let i=0;i<actual.length;i++){
      const err=Math.abs((actual[i]??0)-(reference.values[i]??0))
      max=Math.max(max,err);sq+=err*err
    }
    const rms=Math.sqrt(sq/actual.length)
    console.log(`MFCC compatibility maxError=${max} rms=${rms}`)
    expect(max).toBeLessThan(0.01)
    expect(rms).toBeLessThan(0.002)
  })
})
