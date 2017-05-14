var ruleSample = {
    '*zhibo.focus*.cn/*': {
        '*t.focus-res**.cn/***': true,
        '*live-list.**js***': [],
        '*/ajax/liveroom/upcoming/list**': {
            request: {
                headers: {
                    'Cookie': 'IPLOC=CN1101; SUV=1704150106190463; ppinf=MXwxNDkyMTg5NzE4NTUzfDE0OTQ3ODE3MTg1NTN8MTQzMDUxODk1fHBwYWc4MDI5NDFiZGFhOWNAc29odS5jb20; pprdig=ZibKor0PGv8xYXu5dKC+WHH+jaokeKsdDBzuTbJIjnvoe0Jht87FIEBCyb5JpGS56IqRo88J3KwvXvxXKnyLvQv5oNT/GhFiJIY+3McjuXPO2DOlHZJZdQjqB9ANEoWajqfoMWUcN4//mdjt0NEDpzcfOj6jwvTMr/JB8ZKlMGE; focusinf=MTQzMDUxODk1; focus_pc_city_p=house; focus_city_p=house; focus_city_c=110100; focus_city_s=bj; pc_ad_feed=1',
                    'Host': 'api-zhibo.focus.cn',
                    'Origin': 'https://zhibo.focus.cn',
                    'Referer': 'https://zhibo.focus.cn/bj'
                }
            },
            response: {
                body: '../test/resources/api1.json'
            }
        },
        '*/ajax/liveroom/hot/list**': {
            request: {
                mode: 'cors'
            },
            response: function (request, require) {
                var fs = require('fs');
                var list = JSON.parse(fs.readFileSync('../test/resources/api2.json', 'utf8'));
                return {
                    body: request.query.pageNumber === 1 ? list : list
                };
            }
        },
        '*//login.focus**.cn/passport/getUserInfo***': {
            response: {
                headers: {},
                body: {
                    "data": {
                        "uid": 143051895,
                        "userName": "ppag802941bdaa9c@sohu.com",
                        "nickName": "网友543785526",
                        "defaultNick": true,
                        "avatar": "https://a1.itc.cn/sceapp/focus_static/passport/images/default_avatar.jpg",
                        "defaultAvatar": true,
                        "birthDay": null,
                        "gender": 0,
                        "mobile": "18518408029",
                        "bindEmail": "",
                        "province": 0,
                        "city": 0,
                        "changeStatus": 0,
                        "accreditStatus": 0,
                        "accreditRoleType": 0,
                        "introduce": null
                    },
                    "code": 200,
                    "msg": "成功",
                    "errorCode": 0,
                    "errorMessage": "success",
                    "description": "保持和生态一致，返回结果里增加了code和msg字段，同时为保证兼容，errorCode、errorMessge依然保留，请使用code和msg"
                }
            }
        }
    }
};
