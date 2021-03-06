export const standard = {
	total_replies: 2,
	hidden_replies: 0,
	id: null,
	replies: [
		{
			id: 1,
			parent: null,
			text: '<p>Hello, World!</p>\n',
			mode: 1,
			hash: '4505c1eeda98',
			author: 'Peter Pan',
			website: 'peterpan.org',
			created: 1387321261.572392,
			modified: null,
			likes: 3,
			dislikes: 1,
			total_replies: 1,
			hidden_replies: 0,
			replies: [
				{
					id: 2,
					parent: 1,
					text: '<p>Response</p>\n',
					mode: 1,
					hash: '4509c1eeda98',
					author: 'Max Müller',
					website: 'max@müller.org',
					created: 1387321278.572392,
					modified: 1387321378.613392,
					likes: 0,
					dislikes: 1,
				}
			]
		}, {
			id: 3,
			parent: null,
			text: '<p>Response</p>\n',
			mode: 1,
			hash: '4509c1eeda98',
			author: 'Max Müller',
			website: 'max@müller.org',
			created: 1387321281.572392,
			modified: <number | null> null,
			likes: 0,
			dislikes: 1,
			total_replies: 0,
			hidden_replies: 0,
			replies: <Array<any>> []
		}
	]
};

export const deeplyNested = {
	total_replies: 3,
	hidden_replies: 0,
	id: null,
	replies: [
		{
			id: 1,
			parent: null,
			text: '<p>Hello, World!</p>\n',
			mode: 1,
			hash: '4505c1eeda98',
			author: 'Peter Pan',
			website: 'peter@pan.org',
			created: 1387321261.572392,
			modified: null,
			likes: 3,
			dislikes: 0,
			total_replies: 1,
			hidden_replies: 0,
			replies: [
				{
					id: 2,
					parent: 1,
					text: '<p>Response</p>\n',
					mode: 1,
					hash: '4509c1eeda98',
					author: 'Max Müller',
					website: 'max@müller.org',
					created: 138732125.572392,
					modified: <any>null,
					total_replies: 2,
					hidden_replies: 0,
					replies: [
						{
							id: 4,
							parent: 2,
							text: '<p>Nested Response</p>\n',
							mode: 1,
							hash: '4509c1ghda98',
							author: null,
							website: null,
							created: 138733125.572392,
							modified: <any>null,
							total_replies: 1,
							hidden_replies: 0,
							replies: [{
								id: 6,
								parent: 4,
								text: '<p>Deeply Nested Response</p>\n',
								mode: 1,
								hash: '4509c1abda98',
								author: null,
								website: null,
								created: 138733525.572392,
								modified: <any>null,
								total_replies: 1,
								hidden_replies: 0,
								likes: 0,
								dislikes: 0,
							}],
							likes: 0,
							dislikes: 0,
						}, {
							id: 5,
							parent: 2,
							text: '<p>Another Nested Response</p>\n',
							mode: 1,
							hash: '4509c1ghda98',
							author: null,
							website: null,
							created: 138733125.572392,
							modified: <any>null,
							total_replies: 1,
							hidden_replies: 0,
							likes: 0,
							dislikes: 0,
						}
					],
					likes: 0,
					dislikes: 1,
				}
			]
		}, {
			id: 3,
			parent: null,
			text: '<p>Response</p>\n',
			mode: 1,
			hash: '4509c1eeda98',
			author: 'Max Müller',
			website: 'max@müller.org',
			created: 1387321291.572392,
			modified: null,
			likes: 0,
			dislikes: 1,
			total_replies: 0,
			hidden_replies: 0,
			replies: <Array<any>> []
		}, {
			id: 7,
			parent: null,
			text: '<p>Yet another comments</p>\n',
			mode: 1,
			hash: '4509cuiaea98',
			author: 'Marina Müller',
			website: 'marina@müller.org',
			created: 1387321391.572392,
			modified: null,
			likes: 5,
			dislikes: 2,
			total_replies: 0,
			hidden_replies: 0,
			replies: <Array<any>> []
		}
	]
};

export const forSorting = {
	total_replies: 6,
	hidden_replies: 0,
	id: null,
	replies: [
		{
			id: 1,
			parent: null,
			text: '<p>Yet another comments</p>\n',
			mode: 1,
			hash: '4509cuiaea98',
			author: 'Marina Müller',
			website: 'marina@müller.org',
			created: 158732121.572392,
			modified: 158732125.572392,
			likes: 2,
			dislikes: 0,
			total_replies: 0,
			hidden_replies: 0,
			replies: <Array<any>> []
		}, {
			id: 2,
			parent: null,
			text: '<p>Yet another comments</p>\n',
			mode: 1,
			hash: '4509cuiaea98',
			author: 'Marina Müller',
			website: 'marina@müller.org',
			created: 158732122.572392,
			modified: null,
			likes: 2,
			dislikes: 9,
			total_replies: 0,
			hidden_replies: 0,
			replies: <Array<any>> []
		}, {
			id: 3,
			parent: null,
			text: '<p>Yet another comments</p>\n',
			mode: 1,
			hash: '4509cuiaea98',
			author: 'Marina Müller',
			website: 'marina@müller.org',
			created: 158732123.572392,
			modified: 158732128.572392,
			likes: 0,
			dislikes: 4,
			total_replies: 0,
			hidden_replies: 0,
			replies: <Array<any>> []
		}, {
			id: 4,
			parent: null,
			text: '<p>Yet another comments</p>\n',
			mode: 1,
			hash: '4509cuiaea98',
			author: 'Marina Müller',
			website: 'marina@müller.org',
			created: 158732124.572392,
			modified: 158732129.572392,
			likes: 8,
			dislikes: 2,
			total_replies: 0,
			hidden_replies: 0,
			replies: <Array<any>> []
		}, {
			id: 5,
			parent: null,
			text: '<p>Yet another comments</p>\n',
			mode: 1,
			hash: '4509cuiaea98',
			author: 'Marina Müller',
			website: 'marina@müller.org',
			created: 158732125.572392,
			modified: null,
			likes: 3,
			dislikes: 0,
			total_replies: 0,
			hidden_replies: 0,
			replies: <Array<any>> []
		}, {
			id: 6,
			parent: null,
			text: '<p>Yet another comments</p>\n',
			mode: 1,
			hash: '4509cuiaea98',
			author: 'Marina Müller',
			website: 'marina@müller.org',
			created: 158732126.572392,
			modified: null,
			likes: 4,
			dislikes: 2,
			total_replies: 0,
			hidden_replies: 0,
			replies: <Array<any>> []
		}
	]
};
