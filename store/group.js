import { firebase } from '../config/firebase';
import { deleteUserGroup, _fetchSingleFriendInfo } from './user';

const SET_GROUPS = 'SET_GROUPS';
const ADD_GROUP = 'CREATE_GROUP';
const SELECT_GROUP = 'SELECT_GROUP';
const DELETE_GROUP = 'DELETE_GROUP';
const CLEAR_GROUPS = 'CLEAR_GROUPS';
const SET_GROUP_MEMBERS = 'SET_GROUP_MEMBERS';

export const _setGroups = (groups) => {
  return {
    type: SET_GROUPS,
    groups,
  };
};
export const _addGroup = (group) => {
  return {
    type: ADD_GROUP,
    group,
  };
};

export const _selectGroup = (selectedGroup) => {
  return {
    type: SELECT_GROUP,
    selectedGroup,
  };
};

export const _deleteGroup = (groupId) => {
  return {
    type: DELETE_GROUP,
    groupId,
  };
};

export const setGroupMembers = (members) => {
  return {
    type: SET_GROUP_MEMBERS,
    members,
  };
};

export const clearGroups = () => {
  return {
    type: CLEAR_GROUPS,
    groups: [],
    selectedGroup: {
      id: '',
      group: {},
      members: [],
    },
  };
};

//should return a list of groups that user is part of
export const fetchUserGroups = (user) => {
  return async (dispatch) => {
    try {
      //this is the user we want to fetch groups for
      let groupsArray = [];
      let arrayOfIds = await firebase
        .firestore()
        .collection('users')
        .doc(user.id)
        .get()
        .then((snapshot) => {
          groupsArray = snapshot.data().groups;
        });
      // console.log("USER GROUPS IN REDUX", userGroups)
      //  dispatch(_setGroups(userGroups))

      //map through their array of groupIDs and find the group objects in firestore
      let groupsArrayInfo = [];
      let userGroups = await Promise.all(
        groupsArray.map(async (group) => {
          await firebase
            .firestore()
            .collection('groups')
            .doc(group)
            .get()
            .then((snapshot) => {
              groupsArrayInfo.push({ ...snapshot.data(), id: group });
              return snapshot.data();
            });
        })
      );
      dispatch(_setGroups(groupsArrayInfo));
    } catch (err) {
      console.log(err);
    }
  };
};

export const createGroup = ({ name, members }) => {
  return async (dispatch) => {
    try {
      const data = {
        name,
        members,
      };

      // returns id of newly created group
      let groupId = await firebase
        .firestore()
        .collection('groups')
        .add(data)
        .then((result) => {
          return result.id;
        });

      // adds the new groupID to each members' groups array on their user object
      members.forEach(
        async (memberId) =>
          await firebase
            .firestore()
            .collection('users')
            .doc(memberId)
            .update({
              groups: firebase.firestore.FieldValue.arrayUnion(groupId),
            })
      );
      //adds the new group to the redux store
      dispatch(
        _addGroup({
          name,
          members,
          groupId,
        })
      );
    } catch (err) {
      console.log(err);
    }
  };
};

export const deleteGroup = (groupId, members) => {
  return async (dispatch) => {
    try {
      // delete the group based on id
      let group = await firebase
        .firestore()
        .collection('groups')
        .doc(groupId)
        .delete();
      // delete the group from every group member
      members.map(
        async (memberId) =>
          await firebase
            .firestore()
            .collection('users')
            .doc(memberId)
            .update({
              groups: firebase.firestore.FieldValue.arrayRemove(groupId),
            })
      );
      //deletes group from redux store
      dispatch(_deleteGroup(groupId));
    } catch (err) {
      console.log(err);
    }
  };
};

export const _fetchGroupMembers = (memberIds) => {
  return async (dispatch) => {
    try {
      let groupMembers = await Promise.all(
        memberIds.map(
          async (memberId) => await _fetchSingleFriendInfo(memberId)
        )
      );

      dispatch(setGroupMembers(groupMembers));
    } catch (err) {
      console.log(err);
    }
  };
};

export const selectGroup = (groupId) => {
  return async (dispatch) => {
    try {
      //fetch the group from firestore
      let selectedGroup = await firebase
        .firestore()
        .collection('groups')
        .doc(groupId)
        .get()
        .then((snapshot) => {
          let group = snapshot.data();

          dispatch(_selectGroup({ group: group, id: groupId }));
        });
      //set the retrieved object to the selectedGroup key on redux state
    } catch (err) {
      console.log(err);
    }
  };
};

const initialState = {
  groups: [],
  selectedGroup: {
    id: '',
    group: {},
    members: [],
  },
};
export default (state = initialState, action) => {
  switch (action.type) {
    case SET_GROUPS:
      return { ...state, groups: action.groups };
    case ADD_GROUP:
      return { ...state, groups: [...state.groups, action.group] };
    case DELETE_GROUP:
      const deletedGroups = state.groups.filter(
        (group) => group.id !== action.groupId
      );

      const deletedGroup =
        action.groupId === state.selectedGroup.id
          ? { id: '', group: {}, members: [] }
          : state.selectedGroup;

      return {
        ...state,
        groups: deletedGroups,
        selectedGroup: deletedGroup,
      };
    case SELECT_GROUP:
      return {
        ...state,
        selectedGroup: {
          members: state.selectedGroup.members,
          id: action.selectedGroup.id,
          group: action.selectedGroup.group,
        },
      };
    case SET_GROUP_MEMBERS:
      return {
        ...state,
        selectedGroup: {
          members: action.members,
          id: state.selectedGroup.id,
          group: state.selectedGroup.group,
        },
      };
    case CLEAR_GROUPS:
      return {
        ...state,
        groups: action.groups,
        selectedGroup: action.selectedGroup,
      };
    default:
      return state;
  }
};
