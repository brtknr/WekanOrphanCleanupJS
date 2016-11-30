// Author: Bharat Kunwar (2016)
// If you use a `wekan' docker container with mongodb
// and needed to delete some users you accidentally created,
// you end up destroying the harmonious relationship between:
// 		- users and boards
// 		- boards and lists
// 		- lists and cards
// 		- cards and comments
//		- activities and everything
// 		- you get the point.
// This script intended to run after deleting a user permanently 
// which preserves the integrity of rest of the references.

// To delete a user:
db.users.remove({'username':'johndoe'})


// Removes dead members from boards
var docs = db['boards'].find({},{slug:1,'members.userId':1}).toArray();
for (var i in docs) {
	var mem = docs[i]['members'];
	for (j in mem){
		var id = mem[j]['userId'];
		// If the count of userid seach is 0
		if (db.users.find({_id:id}).count() == 0){
			// If the user doesn't exist, remove them from the members list
			print(id);
			db['boards'].update({_id:docs[i]._id},{$pull:{'members':{userId:id}}})
		}
	}
}

// Removes dead members from cards
var docs = db['cards'].find({},{slug:1,'members':1}).toArray();
for (var i in docs) {
	var mem = docs[i]['members'];
	for (j in mem){
		var id = mem[j];
		// If the count of userid seach is 0
		if (db.users.find({_id:id}).count() == 0){
			// If the user doesn't exist, remove them from the members list
			print(id);
			db['cards'].update({_id:docs[i]._id},{$pull:{'members':id}});
		}
	}
}

// Delete orphaned boards if a user doesnt exist
var docs = db['boards'].find({},{slug:1,'members.userId':1}).toArray();
for (i in docs){
	var doc = docs[i]
	if (doc.members.length==0){
		print(doc._id);
		printjson(db.boards.deleteMany(doc));
	}
}


function removeOrphans(childColName,parentColName,parentIndexNameInChild,really){
	// body...
	var childCol = db[childColName];
	var parentCol = db[parentColName];
	var children = childCol.find({}).toArray();
	var count = 0;
	for (i in children){
		var child = children[i]
		if (parentCol.find({"_id":child[parentIndexNameInChild]}).count() == 0){
			// If the comment doesn't exist, remove the activity
			print('Removing child',child._id);
			printjson(child);
			if (really){
				printjson(childCol.deleteMany(child));
			}
			count += 1;
		}
	}
	print(count,'of',children.length,'[',childColName,']','are orphans which have now been removed because they do not have a parent [',parentColName,'].')
}

// Delete orphaned lists if boards do not exist
removeOrphans('lists','boards','boardId',false)

// Delete orphaned cards if lists do not exist
removeOrphans('cards','lists','listId',false)

// Delete orphaned comments if cards do not exist
removeOrphans('card_comments','cards','cardId',false)

// Remove orphan activities
var childColName = 'activities'
var acts = db[childColName].find({}).toArray();
var count = 0;
for (var i in acts){
	var act = acts[i];
	var flag_delete = false;
	if (db.users.find({"_id":act.userId}).count() == 0){
		// If the user doesn't exist, remove the activity
		flag_delete = true;
	}
	if (act.activityType == "createBoard"){
		if (db.boards.find({"_id":act.boardId}).count() == 0){
			// If the comment doesn't exist, remove the activity
			flag_delete = true;
		}
	} else 	if (act.activityType == "createList" || act.activityType=="archivedList"){
		if (db.lists.find({"_id":act.listId}).count() == 0){
			// If the comment doesn't exist, remove the activity
			flag_delete = true;
		}
	} else 	if (act.activityType == "createCard" || act.activityType == "moveCard"){
		if (db.cards.find({"_id":act.cardId}).count() == 0){
			// If the comment doesn't exist, remove the activity
			flag_delete = true;
		}
	} else if (act.activityType == "addComment"){
		if (db.card_comments.find({"_id":act.commentId}).count() == 0){
			// If the comment doesn't exist, remove the activity
			flag_delete = true;
		}
	} else if (act.activityType == "addBoardMember" || act.activityType == "joinMember"){
		if (db.users.find({"_id":act.memberId}).count() == 0){
			flag_delete = true;
		}
	}
	if (flag_delete){
		print('Removing act',act._id);
		printjson(act);
		count+=1
		if(true){
			printjson(db.activities.deleteMany(act));
		}
	}
}
print(count,'of',acts.length,'[',childColName,']','are orphans which have now been removed because they do not have a parents.')
