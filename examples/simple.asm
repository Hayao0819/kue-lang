* var counter @ 0x180
* var limit @ 0x181
* var result @ 0x182

LD ACC, 0
ST ACC, (180H)
LD ACC, 10
ST ACC, (181H)
LD ACC, (180H)
ST ACC, (182H)
HLT
