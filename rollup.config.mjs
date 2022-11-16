import nodeResolve from '@rollup/plugin-node-resolve'; // 解析 node_modules 中的模块
import commonjs from '@rollup/plugin-commonjs'; // cjs => esm
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index-es.js',
      format: 'es',
    },
    {
      file: 'dist/index.js',
      format: 'cjs',
    },
  ],
  plugins: [nodeResolve(), commonjs(), typescript()],
};
