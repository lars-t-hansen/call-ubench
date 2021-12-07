/* Author: Dmitry Bezhetskov, Igalia */

var M = new WebAssembly.Instance(new WebAssembly.Module(wasmTextToBinary(`
(module
  (func (export "f") (param i32) (result i32)
    (i32.add (local.get 0) (i32.const 42))))
`)));

var ins = new WebAssembly.Instance(new WebAssembly.Module(wasmTextToBinary(`
(module
  (import "M" "f" (func $external (param i32) (result i32)))

  (type $ty (func (param i32) (result i32)))
  (table $t 2 funcref)
  (elem $t (i32.const 0) $external $internal)

  (func $internal (param i32) (result i32)
    (i32.add (local.get 0) (i32.const 37)))

  (func (export "run_external") (param $count i32) (result i32)
    (local $sum i32)
    (block $END
      (loop $LOOP
        (br_if $END (i32.eqz (local.get $count)))
        (local.set $count (i32.sub (local.get $count) (i32.const 1)))
        (local.set $sum
          (i32.add (call_indirect (type $ty) (i32.const 8) (i32.const 0))
                   (local.get $sum)))
        (br $LOOP)))
    (local.get $sum))

  (func (export "run_internal") (param $count i32) (result i32)
    (local $sum i32)
    (block $END
      (loop $LOOP
        (br_if $END (i32.eqz (local.get $count)))
        (local.set $count (i32.sub (local.get $count) (i32.const 1)))
        (local.set $sum
          (i32.add (call_indirect (type $ty) (i32.const 7) (i32.const 1))
                   (local.get $sum)))
        (br $LOOP)))
    (local.get $sum))

  (func (export "run_direct") (param $count i32) (result i32)
    (local $sum i32)
    (block $END
      (loop $LOOP
        (br_if $END (i32.eqz (local.get $count)))
        (local.set $count (i32.sub (local.get $count) (i32.const 1)))
        (local.set $sum
          (i32.add (call $internal (i32.const 7))
                   (local.get $sum)))
        (br $LOOP)))
    (local.get $sum))
)
`)), { M: M.exports });

assertEq(ins.exports.run_external(3), 3*(8+42));
assertEq(ins.exports.run_internal(3), 3*(7+37));
assertEq(ins.exports.run_direct(3), 3*(7+37));

var iter = 100000000;

var runs = (function () { let k = Number(os.getenv("RUNS")); return isNaN(k) || k < 0 ? 1 : k })();
while (runs-- > 0) {
    var then = performance.now();
    ins.exports.run_external(iter);
    print("call/private-table/cross-module " + (performance.now() - then));

    var then = performance.now();
    ins.exports.run_internal(iter);
    print("call/private-table/same-module " + (performance.now() - then));

    var then = performance.now();
    ins.exports.run_direct(iter);
    print("call/direct/same-module " + (performance.now() - then));
}