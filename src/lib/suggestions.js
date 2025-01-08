
export const SUGGESTIONS = {
    go: {
        'fn': ['fn function_name() {}', 'fn function_name(param: Type) -> ReturnType {}'],
        'if': ['if condition {}', 'if condition {} else {}', 'if condition1 {} else if condition2 {} else {}'],
        'for': ['for item in collection {}', 'for i in 0..length {}', 'for (index, item) in collection.iter().enumerate() {}'],
        'while': ['while condition {}', 'loop {}', 'while let Some(value) = option {}'],
        'match': ['match expression { pattern1 => {}, pattern2 => {}, _ => {} }'],
        'struct': ['struct StructName { field1: Type1, field2: Type2 }', 'impl StructName { fn method(&self) {} }'],
        'enum': ['enum EnumName { Variant1, Variant2(Type) }', 'impl EnumName { fn method(&self) {} }'],
        'trait': ['trait TraitName { fn method(&self); }', 'impl TraitName for StructName { fn method(&self) {} }'],
        'impl': ['impl StructName { fn method(&self) {} }', 'impl TraitName for StructName { fn method(&self) {} }'],
        'macro': ['macro_rules! macro_name { (pattern) => { expansion } }'],
        'let': ['let variable_name = value;', 'let variable_name: Type = value;', 'let mut variable_name = value;'],
        'const': ['const CONSTANT_NAME: Type = value;'],
        'static': ['static VARIABLE_NAME: Type = value;'],
        'module': ['mod module_name { }', 'pub mod module_name { }', 'use module_name::ItemName;'],
        'crate': ['extern crate crate_name;', 'use crate_name::ItemName;'],
        'option': ['let option: Option<Type> = Some(value);', 'let option: Option<Type> = None;', 'if let Some(value) = option {}'],
        'result': ['let result: Result<Type, ErrorType> = Ok(value);', 'let result: Result<Type, ErrorType> = Err(error);', 'if let Ok(value) = result {}'],
        'vec': ['let vec_name: Vec<Type> = Vec::new();', 'let vec_name = vec![value1, value2, value3];', 'vec_name.push(value);'],
        'string': ['let string_name = String::from("value");', 'string_name.push_str("more");', 'string_name.push(char);'],
        'println': ['println!("message");', 'println!("{} {}", var1, var2);'],
        'format': ['let formatted = format!("{} {}", var1, var2);'],
        'clone': ['let cloned = original.clone();'],
        'borrow': ['let borrowed = &original;', 'let mut borrowed = &mut original;'],
        'dereference': ['let dereferenced = *pointer;'],
        'thread': ['use std::thread;', 'thread::spawn(|| { /* code */ });'],
        'async': ['async fn async_function() {}', 'let future = async { /* code */ };'],
        'await': ['let result = future.await;'],
        'error': ['use std::error::Error;', 'impl Error for StructName {}'],
        'io': ['use std::io;', 'let mut buffer = String::new();', 'io::stdin().read_line(&mut buffer);'],
        'file': ['use std::fs::File;', 'let file = File::open("path/to/file")?;', 'let mut file = File::create("path/to/file")?;'],
        'read': ['use std::io::Read;', 'file.read_to_string(&mut contents)?;'],
        'write': ['use std::io::Write;', 'file.write_all(b"data")?;'],
        'command': ['use std::process::Command;', 'Command::new("command").arg("arg").spawn()?;'],
        'env': ['use std::env;', 'let var = env::var("VAR_NAME")?;', 'env::set_var("VAR_NAME", "value");']
    },
    php: {
        'function': [
            'function functionName() { // code }',
            'function functionName($param) { // code }',
            'function functionName($param1, $param2): ReturnType { // code }'
        ],
        'if': [
            'if ($condition) { // code }',
            'if ($condition) { // code } else { // code }',
            'if ($condition1) { // code } elseif ($condition2) { // code } else { // code }'
        ],
        'for': [
            'for ($i = 0; $i < $length; $i++) { // code }',
            'foreach ($array as $item) { // code }',
            'foreach ($array as $key => $value) { // code }'
        ],
        'while': [
            'while ($condition) { // code }',
            'do { // code } while ($condition);'
        ],
        'switch': [
            'switch ($variable) { case "value": // code; break; default: // code; }'
        ],
        'class': [
            'class ClassName { public function method() { // code } }',
            'class ClassName extends ParentClass { // code }',
            'class ClassName implements InterfaceName { // code }'
        ],
        'interface': [
            'interface InterfaceName { public function method(); }',
            'class ClassName implements InterfaceName { public function method() { // code } }'
        ],
        'trait': [
            'trait TraitName { public function method() { // code } }',
            'class ClassName { use TraitName; }'
        ],
        'namespace': [
            'namespace NamespaceName;',
            'use NamespaceName\\ClassName;',
            'use function NamespaceName\\functionName;'
        ],
        'array': [
            '$array = [];',
            '$array = [key => value];',
            '$array[] = value;',
            'foreach ($array as $item) { // code }'
        ],
        'string': [
            '$string = "text";',
            '$string = \'text\';',
            '$string = <<<EOT\nmultiline string\nEOT;'
        ],
        'echo': [
            'echo "text";',
            'echo $variable;',
            'echo "text: $variable";'
        ],
        'print': [
            'print("text");',
            'print($variable);'
        ],
        'require': [
            'require "file.php";',
            'require_once "file.php";'
        ],
        'include': [
            'include "file.php";',
            'include_once "file.php";'
        ],
        'file': [
            '$file = fopen("file.txt", "r");',
            '$contents = file_get_contents("file.txt");',
            'file_put_contents("file.txt", $data);'
        ],
        'json': [
            '$json = json_encode($array);',
            '$array = json_decode($json, true);'
        ],
        'session': [
            'session_start();',
            '$_SESSION["key"] = "value";',
            'unset($_SESSION["key"]);'
        ],
        'cookie': [
            'setcookie("name", "value", time() + 3600);',
            '$_COOKIE["name"];',
            'setcookie("name", "", time() - 3600);'
        ],
        'http': [
            'header("Content-Type: application/json");',
            'header("Location: /path/to/page");'
        ],
        'pdo': [
            '$pdo = new PDO($dsn, $username, $password);',
            '$stmt = $pdo->prepare("SELECT * FROM table WHERE id = :id");',
            '$stmt->execute([":id" => $id]);'
        ],
        'mysqli': [
            '$mysqli = new mysqli($host, $username, $password, $dbname);',
            '$result = $mysqli->query("SELECT * FROM table");',
            'while ($row = $result->fetch_assoc()) { // code }'
        ],
        'error': [
            'try { // code } catch (Exception $e) { echo $e->getMessage(); }',
            'throw new Exception("Error message");'
        ],
        'date': [
            '$date = date("Y-m-d H:i:s");',
            '$timestamp = strtotime($dateString);'
        ],
        'env': [
            'putenv("VAR_NAME=value");',
            '$value = getenv("VAR_NAME");'
        ],
        'composer': [
            'composer require package/name',
            'composer install',
            'composer update'
        ],
        'cli': [
            '$argv[0]; // Script name',
            'foreach ($argv as $arg) { // code }'
        ],
        'process': [
            'exec("command", $output, $returnVar);',
            'shell_exec("command");'
        ]
    },
    java: {
        'func': ['void functionName() {}', 'int functionName() { return 0; }', 'String functionName() { return ""; }'],
        'if': ['if (condition) {}', 'if (condition) {} else {}', 'if (condition1) {} else if (condition2) {} else {}'],
        'for': ['for (int i = 0; i < length; i++) {}', 'for (int i = length - 1; i >= 0; i--) {}', 'for (Object item : collection) {}'],
        'while': ['while (condition) {}', 'do {} while (condition);'],
        'class': ['public class ClassName {}', 'public class ClassName extends ParentClass {}', 'public class ClassName { private int field; public ClassName() {} public void method() {} }'],
        'switch': ['switch (expression) { case value1: break; case value2: break; default: }'],
        'try': ['try {} catch (ExceptionType e) {}', 'try {} catch (ExceptionType e) {} finally {}'],
        'catch': ['catch (ExceptionType e) {}'],
        'finally': ['finally {}'],
        'import': ['import packageName.ClassName;', 'import static packageName.ClassName.staticMember;'],
        'export': ['// Java does not have an export statement like JavaScript'],
        'new': ['ClassName objectName = new ClassName();'],
        'extends': ['public class ClassName extends ParentClass {}'],
        'implements': ['public class ClassName implements InterfaceName {}'],
        'interface': ['public interface InterfaceName { void method(); }'],
        'enum': ['public enum EnumName { CONSTANT1, CONSTANT2, CONSTANT3 }'],
        'annotation': ['@Override', '@Deprecated', '@SuppressWarnings("unchecked")'],
        'lambda': ['(params) -> { }'],
        'stream': ['collection.stream().filter(condition).collect(Collectors.toList());'],
        'optional': ['Optional<Type> optional = Optional.of(value);', 'Optional<Type> optional = Optional.empty();'],
        'array': ['Type[] arrayName = new Type[size];', 'Type[] arrayName = {value1, value2, value3};'],
        'list': ['List<Type> listName = new ArrayList<>();', 'List<Type> listName = Arrays.asList(value1, value2);'],
        'map': ['Map<KeyType, ValueType> mapName = new HashMap<>();', 'mapName.put(key, value);', 'mapName.get(key);'],
        'set': ['Set<Type> setName = new HashSet<>();', 'setName.add(value);', 'setName.contains(value);'],
        'queue': ['Queue<Type> queueName = new LinkedList<>();', 'queueName.add(value);', 'queueName.poll();'],
        'thread': ['Thread thread = new Thread(runnable);', 'thread.start();'],
        'synchronized': ['synchronized (lock) { }'],
        'volatile': ['private volatile Type variableName;'],
        'static': ['public static void methodName() {}', 'public static final Type CONSTANT_NAME = value;'],
        'final': ['public final class ClassName {}', 'public final void methodName() {}', 'public final Type variableName;'],
        'abstract': ['public abstract class ClassName { abstract void methodName(); }'],
        'package': ['package packageName;']
    },
    markdown: {
        'head': [
            '# Başlık 1',
            '## Başlık 2',
            '### Başlık 3',
            '#### Başlık 4',
            '##### Başlık 5',
            '###### Başlık 6'
        ],
        'list': [
            '- Liste öğesi',
            '1. Numaralı liste',
            '* Yıldızlı liste',
            '+ Artılı liste'
        ],
        'format': [
            '**Kalın metin**',
            '*İtalik metin*',
            '***Kalın ve italik***',
            '~~Üstü çizili~~',
            '`Kod parçası`'
        ],
        'link': [
            '[Link metni](URL)',
            '![Resim açıklaması](resim-url)',
            '[Link metni](URL "Tooltip text")',
            '<URL>'
        ],
        'table': [
            '| Başlık 1 | Başlık 2 |\n|-----------|----------|\n| İçerik 1  | İçerik 2 |',
            '| Sol | Orta | Sağ |\n|:---|:---:|---:|'
        ],
        'code': [
            '```\nKod bloğu\n```',
            '```javascript\nJavaScript kod bloğu\n```',
            '```python\nPython kod bloğu\n```',
            '```java\nJava kod bloğu\n```'
        ],
        'quote': [
            '> Alıntı metni',
            '>> İç içe alıntı',
            '> - Alıntı içinde liste'
        ],
        'line': [
            '---',
            '***',
            '___'
        ],
        'checkbox': [
            '- [ ] Yapılacak görev',
            '- [x] Tamamlanmış görev'
        ],
        'escape': [
            '\\* Yıldız',
            '\\# Diyez',
            '\\[ Köşeli parantez',
            '\\( Parantez'
        ],
        'footnote': [
            '[^1]: Dipnot açıklaması',
            'Metin içinde dipnot[^1]'
        ],
        'definition': [
            'Terim\n: Tanım',
            '[Terim]: Tanım'
        ],
        'abbreviation': [
            '*[Kısaltma]: Açıklama'
        ]
    },
    rust: {
        'func': ['func functionName() {}', 'func functionName(param Type) Type {}', 'func (r ReceiverType) methodName() {}'],
        'if': ['if condition {}', 'if condition {} else {}', 'if condition1 {} else if condition2 {} else {}'],
        'for': ['for i := 0; i < length; i++ {}', 'for index, item := range items {}', 'for condition {}'],
        'switch': ['switch expression { case value1: break; case value2: break; default: }'],
        'select': ['select { case channel1 := <-ch1: break; case channel2 := <-ch2: break; default: }'],
        'struct': ['type StructName struct { Field1 Type1; Field2 Type2; }', 'var aStruct StructName'],
        'interface': ['type InterfaceName interface { MethodName() Type }'],
        'channel': ['ch := make(chan Type)', 'ch <- value', 'value := <-ch'],
        'go': ['go functionName()', 'go func() { /* code */ }()'],
        'defer': ['defer cleanupFunction()'],
        'panic': ['panic("message")'],
        'recover': ['defer func() { if r := recover(); r != nil { /* handle panic */ } }()'],
        'import': ['import "packageName"', 'import ( "package1" "package2" )'],
        'package': ['package packageName'],
        'const': ['const constantName = value', 'const ( constantName1 = value1; constantName2 = value2; )'],
        'var': ['var variableName Type', 'var variableName = value', 'var ( variableName1 Type1; variableName2 Type2; )'],
        'map': ['var mapName map[KeyType]ValueType', 'mapName = make(map[KeyType]ValueType)', 'mapName[key] = value'],
        'slice': ['var sliceName []Type', 'sliceName := make([]Type, length)', 'sliceName = append(sliceName, value)'],
        'array': ['var arrayName [size]Type', 'arrayName := [size]Type{value1, value2}'],
        'range': ['for index, value := range collection {}'],
        'make': ['slice := make([]Type, length)', 'channel := make(chan Type)', 'mapVar := make(map[KeyType]ValueType)'],
        'len': ['length := len(collection)'],
        'cap': ['capacity := cap(slice)'],
        'append': ['slice = append(slice, value)'],
        'copy': ['copy(destSlice, srcSlice)'],
        'print': ['fmt.Println(value)', 'fmt.Printf("format", value)', 'fmt.Sprintf("format", value)'],
        'error': ['func() (Type, error) { if condition { return value, nil } return value, fmt.Errorf("error message") }'],
        'log': ['log.Println(message)', 'log.Printf("format", value)', 'log.Fatal(message)', 'log.Panic(message)'],
        'http': ['http.HandleFunc("/path", handlerFunc)', 'http.ListenAndServe(":port", nil)'],
        'json': ['json.Marshal(value)', 'json.Unmarshal(data, &value)'],
        'time': ['time.Now()', 'time.Sleep(duration)'],
        'goroutine': ['go functionName()', 'go func() { /* code */ }()'],
        'sync': ['var mu sync.Mutex', 'mu.Lock()', 'mu.Unlock()'],
        'atomic': ['atomic.AddInt32(&variable, delta)', 'atomic.LoadInt32(&variable)', 'atomic.StoreInt32(&variable, value)']
    },
    javascript: {
        'func': ['function functionName() {}', 'const functionName = () => {}'],
        'if': ['if (condition) {}', 'if (condition) {} else {}', 'if (condition1) {} else if (condition2) {} else {}'],
        'for': ['for (let i = 0; i < length; i++) {}', 'for (const item of items) {}', 'for (const key in object) {}'],
        'while': ['while (condition) {}', 'do {} while (condition);'],
        'caf': ['const functionName = () => {}'],
        'cnf': ['function functionName(){}'],
        'class': ['class ClassName {}', 'class ClassName extends ParentClass {}', 'class ClassName { constructor() {} methodName() {} }'],
        'switch': ['switch (expression) { case value1: break; case value2: break; default: }'],
        'try': ['try {} catch (error) {}', 'try {} catch (error) {} finally {}'],
        'catch': ['catch (error) {}'],
        'finally': ['finally {}'],
        'import': ['import moduleName from "module";', 'import { namedImport } from "module";', 'import * as alias from "module";'],
        'export': ['export default functionName;', 'export const variableName = value;', 'export { namedExport };'],
        'arrow': ['const functionName = (params) => {};'],
        'async': ['async function functionName() {}', 'const functionName = async () => {};'],
        'await': ['await asyncFunction();'],
        'promise': ['new Promise((resolve, reject) => {});'],
        'setTimeout': ['setTimeout(() => {}, delay);'],
        'setInterval': ['setInterval(() => {}, interval);'],
        'fetch': ['fetch(url).then(response => response.json()).then(data => {}).catch(error => {});'],
        'map': ['array.map(item => {});'],
        'filter': ['array.filter(item => condition);'],
        'reduce': ['array.reduce((accumulator, currentValue) => {}, initialValue);'],
        'find': ['array.find(item => condition);'],
        'findIndex': ['array.findIndex(item => condition);'],
        'push': ['array.push(item);'],
        'pop': ['array.pop();'],
        'shift': ['array.shift();'],
        'unshift': ['array.unshift(item);'],
        'splice': ['array.splice(startIndex, deleteCount, item1, item2, ...);'],
        'slice': ['array.slice(startIndex, endIndex);'],
        'concat': ['array1.concat(array2);'],
        'join': ['array.join(separator);'],
        'split': ['string.split(separator);'],
        'toUpperCase': ['string.toUpperCase();'],
        'toLowerCase': ['string.toLowerCase();'],
        'charAt': ['string.charAt(index);'],
        'includes': ['array.includes(item);', 'string.includes(substring);'],
        'indexOf': ['array.indexOf(item);', 'string.indexOf(substring);'],
        'lastIndexOf': ['array.lastIndexOf(item);', 'string.lastIndexOf(substring);'],
        'trim': ['string.trim();'],
        'replace': ['string.replace(searchValue, newValue);'],
        'regex': ['/pattern/flags;'],
        'jsonParse': ['JSON.parse(string);'],
        'jsonStringify': ['JSON.stringify(object);'],
        'documentGetElementById': ['document.getElementById("id");'],
        'documentQuerySelector': ['document.querySelector(selector);'],
        'documentQuerySelectorAll': ['document.querySelectorAll(selector);'],
        'addEventListener': ['element.addEventListener(event, handler);'],
        'removeEventListener': ['element.removeEventListener(event, handler);'],
        'createElement': ['document.createElement(tagName);'],
        'appendChild': ['parent.appendChild(child);'],
        'removeChild': ['parent.removeChild(child);'],
        'classListAdd': ['element.classList.add(className);'],
        'classListRemove': ['element.classList.remove(className);'],
        'localStorageSetItem': ['localStorage.setItem(key, value);'],
        'localStorageGetItem': ['localStorage.getItem(key);'],
        'localStorageRemoveItem': ['localStorage.removeItem(key);'],
        'sessionStorageSetItem': ['sessionStorage.setItem(key, value);'],
        'sessionStorageGetItem': ['sessionStorage.getItem(key);'],
        'sessionStorageRemoveItem': ['sessionStorage.removeItem(key);'],
        'useEffect': ['useEffect(() => { /* side effect */ }, []);', 'useEffect(() => { return () => { /* cleanup */ }; }, [dependencies]);'],
        'useState': ['const [state, setState] = useState(initialValue);'],
        'useRef': ['const ref = useRef(null);'],
        'useContext': ['const value = useContext(SomeContext);'],
        'useReducer': ['const [state, dispatch] = useReducer(reducer, initialState);'],
        'useCallback': ['const memoizedCallback = useCallback(() => { /* function */ }, [dependencies]);'],
        'useMemo': ['const memoizedValue = useMemo(() => computeExpensiveValue(param), [param]);'],
        'useLayoutEffect': ['useLayoutEffect(() => { /* effect */ }, [dependencies]);'],
        'useImperativeHandle': ['useImperativeHandle(ref, () => ({ /* instance methods */ }), [dependencies]);'],
        'useDebugValue': ['useDebugValue(value);'],
        'useId': ['const id = useId();'],
    },
    python: {
        'def': ['def function_name():', 'def function_name(param1, param2):', 'def function_name() -> ReturnType:'],
        'if': ['if condition:', 'if condition:\n    pass\nelse:', 'if condition1:\n    pass\nelif condition2:\n    pass\nelse:'],
        'for': ['for item in collection:', 'for i in range(length):', 'for index, item in enumerate(collection):'],
        'while': ['while condition:', 'while condition:\n    pass\nelse:'],
        'class': ['class ClassName:', 'class ClassName(BaseClass):', 'class ClassName:\n    def __init__(self):\n        pass'],
        'try': ['try:\n    pass\nexcept Exception as e:\n    pass', 'try:\n    pass\nexcept Exception as e:\n    pass\nfinally:\n    pass'],
        'import': ['import module_name', 'import module_name as alias', 'from module_name import item'],
        'lambda': ['lambda x: x + 1', 'lambda x, y: x + y'],
        'list': ['list_name = []', 'list_name = [item1, item2, item3]', 'list_name.append(item)'],
        'dict': ['dict_name = {}', 'dict_name = {"key1": value1, "key2": value2}', 'dict_name["key"] = value'],
        'set': ['set_name = set()', 'set_name = {item1, item2, item3}', 'set_name.add(item)'],
        'tuple': ['tuple_name = (item1, item2, item3)', 'tuple_name = tuple([item1, item2, item3])'],
        'str': ['str_name = "string"', 'str_name = str(variable)'],
        'print': ['print(value)', 'print(f"Formatted string {variable}")'],
        'input': ['input_value = input("Prompt: ")'],
        'with': ['with open("file.txt", "r") as file:', 'with context_manager as resource:'],
        'open': ['open("file.txt", "r")', 'open("file.txt", "w")'],
        'file_read': ['file.read()', 'file.readline()', 'file.readlines()'],
        'file_write': ['file.write(data)', 'file.writelines(lines)'],
        'list_comprehension': ['[expression for item in collection]', '[expression for item in collection if condition]'],
        'dict_comprehension': ['{key: value for item in collection}', '{key: value for item in collection if condition}'],
        'set_comprehension': ['{expression for item in collection}', '{expression for item in collection if condition}'],
        'generator_expression': ['(expression for item in collection)', '(expression for item in collection if condition)'],
        'map': ['map(function, collection)', 'map(lambda x: x + 1, collection)'],
        'filter': ['filter(function, collection)', 'filter(lambda x: x > condition, collection)'],
        'reduce': ['from functools import reduce', 'reduce(function, collection)'],
        'sort': ['sorted(collection)', 'collection.sort()'],
        'reverse': ['reversed(collection)', 'collection.reverse()'],
        'enumerate': ['enumerate(collection)'],
        'zip': ['zip(collection1, collection2)'],
        'range': ['range(stop)', 'range(start, stop)', 'range(start, stop, step)'],
        'len': ['len(collection)'],
        'sum': ['sum(collection)'],
        'min': ['min(collection)'],
        'max': ['max(collection)'],
        'abs': ['abs(value)'],
        'round': ['round(value)', 'round(value, ndigits)'],
        'math': ['import math', 'math.sqrt(value)', 'math.pow(base, exp)', 'math.sin(angle)', 'math.cos(angle)', 'math.tan(angle)'],
        'datetime': ['import datetime', 'datetime.datetime.now()', 'datetime.datetime.strptime(date_string, format)', 'datetime.datetime.strftime(format)'],
        'json': ['import json', 'json.dumps(obj)', 'json.loads(json_string)', 'json.dump(obj, file)', 'json.load(file)'],
        're': ['import re', 're.match(pattern, string)', 're.search(pattern, string)', 're.findall(pattern, string)', 're.sub(pattern, repl, string)'],
        'sys': ['import sys', 'sys.argv', 'sys.exit()'],
        'os': ['import os', 'os.listdir(path)', 'os.mkdir(path)', 'os.remove(path)', 'os.path.exists(path)'],
        'logging': ['import logging', 'logging.basicConfig(level=logging.DEBUG)', 'logging.debug(message)', 'logging.info(message)', 'logging.warning(message)', 'logging.error(message)', 'logging.critical(message)'],
        'argparse': ['import argparse', 'parser = argparse.ArgumentParser()', 'parser.add_argument("--option")', 'args = parser.parse_args()'],
        'asyncio': ['import asyncio', 'async def async_function():', 'await coro', 'asyncio.run(main())']
    }
    // Diğer diller için benzer yapılar eklenebilir...
};