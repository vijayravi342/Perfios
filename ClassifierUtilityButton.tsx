
import React from 'react';
import { Typography, ListItemIcon, Tooltip, makeStyles, Drawer, Divider, List, ListItem, Collapse } from '@material-ui/core';
import { messages } from 'constants/messages';
import BeenhereIcon from '@material-ui/icons/Beenhere';
import SaveRoundedIcon from '@material-ui/icons/SaveRounded';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';
import DirectionsIcon from '@material-ui/icons/Directions';
import ExpandMore from '@material-ui/icons/ExpandMore';
import ExpandLess from '@material-ui/icons/ExpandLess';
import clsx from 'clsx';
import useGoogleGaAnalytics from 'utils/useGoogleGaAnalytics';
import { reviewTableUtilityButtonIds } from 'constants/salaryslipConstants';

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: theme.typography.fontWeightRegular,
  },
  menuButton: {
    marginRight: 36,
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  drawerOpen: {
    top: '5%',
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerClose: {
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: '3%',
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing(9) + 1,
    },
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  paperWidthClose: {
    height: '90%',
    width: '3.5%',
    top: '25%'
  }
}));


interface IProps {
  validateData?: () => void;
  jumpToNextError?: () => void;
  saveData?: () => void;
  errorNavigationRequired?: boolean;
  nextButtonDisableStatus?: boolean;
  prevButtonDisableStatus?: boolean;
  nextButtonOperation?: Function;
  previousButtonOperation?: Function;
}


const ClassifierUtilityButton: React.FC<IProps> = (props) => {
  const classes = useStyles();
  const [openDrawer] = React.useState(false);
  const [openUtilities, setopenUtilities] = React.useState(true);


  const handleToggleUtilities = () => {
    setopenUtilities(!openUtilities);
  };

  const listener = useGoogleGaAnalytics(messages['category.salaryslip.review.table.container']);


  const handleUtilityButtonOperation = (buttonId: string) => {
    listener(messages['action.salaryslip.review.table.utility.button'], buttonId);
    switch (buttonId) {
      case reviewTableUtilityButtonIds.VALIDATE:
        props.validateData && props.validateData();
        break;
      case reviewTableUtilityButtonIds.NAVIGATE:
        props.jumpToNextError && props.jumpToNextError();
        break;
      case reviewTableUtilityButtonIds.SAVE_DATA:
        props.saveData && props.saveData();
        break;
      case reviewTableUtilityButtonIds.PREVIOUS:
        props.previousButtonOperation && props.previousButtonOperation();
        break;
      case reviewTableUtilityButtonIds.NEXT:
        props.nextButtonOperation && props.nextButtonOperation();
    }
  }

  return (
    <div className="utility-buttons">
      <div className={classes.root}>
        <Drawer
          anchor="right"
          variant="permanent"
          className={clsx(classes.drawer, {
            [classes.drawerOpen]: openDrawer,
            [classes.drawerClose]: !openDrawer,
          })}
          classes={{
            paper: clsx({
              [classes.drawerOpen]: openDrawer,
              [classes.drawerClose]: !openDrawer,
              [classes.paperWidthClose]: !openDrawer

            }),
          }}
        >
          <Divider />

          <List component="div" disablePadding>
            <ListItem
              onClick={() => handleUtilityButtonOperation(reviewTableUtilityButtonIds.PREVIOUS)}
              disabled={props.prevButtonDisableStatus}
            >
              <Tooltip arrow placement="top-start" title={<React.Fragment>
                <Typography id="validate-other-review-table-id" color="inherit"> <b>{messages['button.previous']}</b></Typography>
              </React.Fragment>}>
                <span>
                  <ListItemIcon >
                    <SkipPreviousIcon color='primary' />
                  </ListItemIcon>
                </span>
              </Tooltip>
            </ListItem>
            <ListItem
              onClick={() => handleUtilityButtonOperation(reviewTableUtilityButtonIds.NEXT)}
              disabled={props.nextButtonDisableStatus}
            >
              <Tooltip arrow placement="top-start" title={<React.Fragment>
                <Typography id="validate-other-review-table-id" color="inherit"> <b>{messages['button.next']}</b></Typography>
              </React.Fragment>}>
                <span>
                  <ListItemIcon >
                    <SkipNextIcon color='primary' />
                  </ListItemIcon>
                </span>
              </Tooltip>
            </ListItem>
          </List>
          <Divider />

          <List>
            <ListItem button onClick={handleToggleUtilities}>
              <Tooltip arrow placement="top-start" title={<React.Fragment>
                <Typography color="inherit"><b>Utilities</b></Typography>
              </React.Fragment>}>
                <span>
                  <ListItemIcon>
                    {openUtilities ? <ExpandLess /> : <ExpandMore />}
                  </ListItemIcon>
                </span>
              </Tooltip>
            </ListItem>
            <Collapse in={openUtilities} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItem onClick={() => handleUtilityButtonOperation(reviewTableUtilityButtonIds.VALIDATE)}>
                  <Tooltip arrow placement="top-start" title={<React.Fragment>
                    <Typography id="validate-other-review-table-id" color="inherit"> <b>{messages['button.validate']}</b></Typography>
                  </React.Fragment>}>
                    <span>
                      <ListItemIcon >
                        <BeenhereIcon color="primary"></BeenhereIcon>
                      </ListItemIcon>
                    </span>
                  </Tooltip>
                </ListItem>
                {props.errorNavigationRequired && <ListItem onClick={() => handleUtilityButtonOperation(reviewTableUtilityButtonIds.NAVIGATE)}>
                  <Tooltip arrow placement="top-start" title={<React.Fragment>
                    <Typography id="other-review-table-navigate-button-id" color="inherit"><b>{messages['button.navigate.error']}</b></Typography>
                  </React.Fragment>}>
                    <span>
                      <ListItemIcon >
                        <DirectionsIcon color="primary"></DirectionsIcon>
                      </ListItemIcon>
                    </span>
                  </Tooltip>
                </ListItem>}
                {props.saveData && <ListItem onClick={() => handleUtilityButtonOperation(reviewTableUtilityButtonIds.SAVE_DATA)}>
                  <Tooltip arrow placement="top-start" title={<React.Fragment>
                    <Typography id="save-other-review-table-button-id" color="inherit"><b>{messages['button.save.table.data']}</b></Typography>
                  </React.Fragment>}>
                    <span>
                      <ListItemIcon>
                        <SaveRoundedIcon color="primary"></SaveRoundedIcon>
                      </ListItemIcon>
                    </span>
                  </Tooltip>
                </ListItem>}
              </List>
            </Collapse>
          </List>
        </Drawer>
      </div>
    </div>
  );


}

export default ClassifierUtilityButton;
